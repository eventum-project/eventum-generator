"""Definition of otlp output plugin."""

import asyncio
import time
from collections.abc import Sequence
from typing import cast, override
from urllib.parse import urlsplit, urlunsplit

from eventum.plugins.exceptions import PluginConfigurationError
from eventum.plugins.output.base.plugin import (
    OutputPlugin,
    OutputPluginParams,
)
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

    @override
    async def _write(self, events: Sequence[str]) -> int:
        batch, payloads = await asyncio.to_thread(self._prepare, events)

        written = 0

        for body, records in payloads:
            result: ExportResult = await self._exporter.send(body, records)
            written += result.accepted

            if result.failure is not None:
                await self._logger.aerror(
                    result.failure.message,
                    count=records,
                    **result.failure.context,
                )

        if payloads and batch.fallback_timestamps:
            await self._logger.awarning(
                'Events without a usable timestamp were written with '
                'the time of writing',
                count=batch.fallback_timestamps,
            )

        if payloads and batch.missing_bodies:
            await self._logger.awarning(
                'Events without the configured body field were written '
                'with the whole event as the body',
                count=batch.missing_bodies,
            )

        return written
