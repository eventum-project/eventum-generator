"""Definition of otlp output plugin."""

import asyncio
import time
from collections.abc import Iterator, Sequence
from typing import Any, cast, override
from urllib.parse import urlsplit, urlunsplit

from eventum.plugins.exceptions import PluginConfigurationError
from eventum.plugins.output.base.plugin import (
    OutputPlugin,
    OutputPluginParams,
)
from eventum.plugins.output.exceptions import PluginWriteError
from eventum.plugins.output.http_client import create_ssl_context
from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.otlp.exporters.base import (
    Exporter,
    ExportResult,
)
from eventum.plugins.output.plugins.otlp.exporters.http import HttpExporter
from eventum.plugins.output.plugins.otlp.mapping import (
    DEFAULT_SERVICE_NAME,
    MappedBatch,
    MappingParams,
    build_resource_attributes,
    map_events,
    parse_path,
)

LOGS_PATH = '/v1/logs'


def build_logs_url(endpoint: str) -> str:
    """Build URL of the logs endpoint.

    Parameters
    ----------
    endpoint : str
        Address of the receiver.

    Returns
    -------
    str
        Address with the logs path appended when the address carries
        no path of its own; a query or fragment already present is
        kept after the appended path.

    """
    parts = urlsplit(endpoint)
    path = parts.path.rstrip('/')

    if path:
        return urlunsplit(parts._replace(path=path))

    return urlunsplit(parts._replace(path=LOGS_PATH))


class _FailedExports:
    """Failures of the export requests performed within a single
    write.

    Notes
    -----
    Failures are grouped by their message and status code, so the
    number of log lines a write produces is bound by the number of
    distinct failures instead of the number of requests it performs.

    """

    def __init__(self) -> None:
        self._groups: dict[
            tuple[str, int | None],
            tuple[int, dict[str, Any]],
        ] = {}

    def add(
        self,
        message: str,
        records: int,
        context: dict[str, Any],
    ) -> None:
        """Add a failed export request.

        Parameters
        ----------
        message : str
            Message of the failure.

        records : int
            Number of records the failed request carried.

        context : dict[str, Any]
            Context of the failure.

        """
        key = (message, context.get('http_status'))
        count, first_context = self._groups.get(key, (0, context))

        self._groups[key] = (count + records, first_context)

    def groups(self) -> Iterator[tuple[str, int, dict[str, Any]]]:
        """Iterate over grouped failures.

        Yields
        ------
        tuple[str, int, dict[str, Any]]
            Message, number of records lost across the group and
            context of the first failure in it.

        """
        for (message, _), (count, context) in self._groups.items():
            yield message, count, context


class OtlpOutputPlugin(
    OutputPlugin[OtlpOutputPluginConfig, OutputPluginParams],
):
    """Output plugin for sending events as OTLP log records."""

    @override
    def __init__(
        self,
        config: OtlpOutputPluginConfig,
        params: OutputPluginParams,
    ) -> None:
        super().__init__(config, params)

        try:
            ssl_context = create_ssl_context(
                verify=config.verify,
                ca_cert=(
                    self.resolve_path(config.ca_cert)
                    if config.ca_cert
                    else None
                ),
                client_cert=(
                    self.resolve_path(config.client_cert)
                    if config.client_cert
                    else None
                ),
                client_key=(
                    self.resolve_path(config.client_cert_key)
                    if config.client_cert_key
                    else None
                ),
            )
        except OSError as e:
            msg = 'Failed to create SSL context'
            raise PluginConfigurationError(
                msg,
                context={'reason': str(e)},
            ) from e

        self._url = build_logs_url(str(config.endpoint))
        service_name = params.get('generator_id', DEFAULT_SERVICE_NAME)
        self._mapping_params = MappingParams(
            flatten=config.flatten_attributes,
            timestamp_path=parse_path(config.timestamp_field),
            severity_path=parse_path(config.severity_field),
            resource_attributes=build_resource_attributes(
                static=config.resource_attributes,
                service_name=service_name,
            ),
            resource_paths=tuple(
                (name, cast('tuple[str, ...]', parse_path(path)))
                for name, path in config.resource_attributes_from.items()
            ),
            body_path=parse_path(config.body_field),
        )
        self._exporter: Exporter = HttpExporter(
            config=config,
            ssl_context=ssl_context,
            url=self._url,
        )
        self._max_request_bytes = config.max_request_bytes

    @override
    async def _open(self) -> None:
        await self._exporter.open()

    @override
    async def _close(self) -> None:
        await self._exporter.close()

    def _prepare(
        self,
        events: Sequence[str],
    ) -> tuple[MappedBatch, list[tuple[bytes, int]]]:
        """Map events and encode them into request bodies."""
        batch: MappedBatch = map_events(
            events,
            self._mapping_params,
            observed_ns=time.time_ns(),
            max_request_bytes=self._max_request_bytes,
        )

        payloads = [
            (self._exporter.encode(request), records)
            for request, records in zip(
                batch.requests,
                batch.records_per_request,
                strict=True,
            )
        ]

        return batch, payloads

    async def _report_failures(self, failures: _FailedExports) -> None:
        """Report grouped failures of the export requests.

        Parameters
        ----------
        failures : _FailedExports
            Collected failures of the requests.

        """
        await asyncio.gather(
            *[
                self._logger.aerror(message, count=count, **context)
                for message, count, context in failures.groups()
            ],
        )

    async def _send_payload(
        self,
        body: bytes,
        records: int,
        failures: _FailedExports,
    ) -> ExportResult:
        """Send one payload, collecting an unexpected failure instead
        of letting it escape the write.

        Parameters
        ----------
        body : bytes
            Serialized body of the request to send.

        records : int
            Number of records the request carries.

        failures : _FailedExports
            Collector an unexpected failure is added to.

        Returns
        -------
        ExportResult
            Result of the delivery, `accepted=0` and no failure of
            its own when sending itself raised - the failure already
            went to `failures`.

        """
        try:
            return await self._exporter.send(body, records)
        except Exception as e:  # noqa: BLE001
            failures.add(
                'Failed to send request to OTLP receiver',
                records,
                {'reason': str(e), 'url': self._url},
            )
            return ExportResult(accepted=0)

    async def _report_notices(
        self,
        batch: MappedBatch,
        payloads: list[tuple[bytes, int]],
        rejected: int,
        partial_message: str,
        unparsable_bodies: int,
    ) -> None:
        """Report non-fatal conditions observed while mapping and
        sending one write's batch.

        Parameters
        ----------
        batch : MappedBatch
            Batch the events of the write were mapped to.

        payloads : list[tuple[bytes, int]]
            Encoded requests the batch was sent as, empty when the
            batch carried no records worth reporting on.

        rejected : int
            Number of records the receiver rejected via a partial
            success across every request of the write.

        partial_message : str
            Partial success message reported for `rejected`, empty
            when none was reported.

        unparsable_bodies : int
            Number of successful responses whose body could not be
            parsed.

        """
        if rejected:
            await self._logger.awarning(
                'OTLP receiver reported a partial success',
                count=rejected,
                reason=partial_message,
            )

        if unparsable_bodies:
            await self._logger.awarning(
                'OTLP receiver returned a successful response with a '
                'body that could not be parsed; its records were '
                'counted as accepted',
                count=unparsable_bodies,
            )

        if not payloads:
            return

        if batch.fallback_timestamps:
            await self._logger.awarning(
                'Events without a usable timestamp fell back to the '
                'time of writing',
                count=batch.fallback_timestamps,
            )

        if batch.missing_bodies:
            await self._logger.awarning(
                'Events without the configured body field fell back '
                'to the whole event as the body',
                count=batch.missing_bodies,
            )

        if batch.oversized_records:
            await self._logger.awarning(
                'Records larger than the request size limit were '
                'packed alone and may be rejected by the receiver',
                count=batch.oversized_records,
            )

    @override
    async def _write(self, events: Sequence[str]) -> int:
        try:
            batch, payloads = await asyncio.to_thread(self._prepare, events)
        except Exception as e:
            msg = 'Failed to map events to OTLP export requests'
            raise PluginWriteError(msg, context={'reason': str(e)}) from e

        written = 0
        rejected = 0
        partial_message = ''
        unparsable_bodies = 0
        failures = _FailedExports()

        for body, records in payloads:
            result = await self._send_payload(body, records, failures)
            written += result.accepted

            if result.failure is not None:
                failures.add(
                    result.failure.message,
                    records,
                    result.failure.context,
                )
                continue

            if result.rejected:
                rejected += result.rejected
                partial_message = partial_message or result.message

            if result.body_unparsable:
                unparsable_bodies += 1

        await self._report_failures(failures)
        await self._report_notices(
            batch,
            payloads,
            rejected,
            partial_message,
            unparsable_bodies,
        )

        return written
