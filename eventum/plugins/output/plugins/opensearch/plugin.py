"""Definition of opensearch output plugin."""

import itertools
import json
from collections.abc import Iterable, Iterator, Sequence
from typing import override

import httpx

from eventum.plugins.exceptions import PluginConfigurationError
from eventum.plugins.output.base.plugin import OutputPlugin, OutputPluginParams
from eventum.plugins.output.exceptions import PluginWriteError
from eventum.plugins.output.http_client import (
    create_client,
    create_ssl_context,
)
from eventum.plugins.output.plugins.opensearch.config import (
    OpensearchOutputPluginConfig,
)


class OpensearchOutputPlugin(
    OutputPlugin[OpensearchOutputPluginConfig, OutputPluginParams],
):
    """Output plugin for indexing events to OpenSearch."""

    @override
    def __init__(
        self,
        config: OpensearchOutputPluginConfig,
        params: OutputPluginParams,
    ) -> None:
        super().__init__(config, params)

        self._hosts = self._choose_host()

        try:
            self._ssl_context = create_ssl_context(
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

        self._client: httpx.AsyncClient

    @override
    async def _open(self) -> None:
        self._client = create_client(
            ssl_context=self._ssl_context,
            username=self._config.username,
            password=self._config.password,
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            connect_timeout=self._config.connect_timeout,
            request_timeout=self._config.request_timeout,
            proxy_url=(
                str(self._config.proxy_url) if self._config.proxy_url else None
            ),
        )

    @override
    async def _close(self) -> None:
        await self._client.aclose()

    def _choose_host(self) -> Iterator[httpx.URL]:
        """Choose host from hosts list specified in config.

        Yields
        ------
        httpx.URL
            Chosen host URL.

        """
        host_urls = [httpx.URL(str(host)) for host in self._config.hosts]

        yield from itertools.cycle(host_urls)

    def _create_bulk_data(self, events: Iterable[str]) -> str:
        """Create body for bulk request. It is expected that events
        are already formatted as single line serialized json document.

        Parameters
        ----------
        events : Iterable[str]
            Events for bulk request.

        Returns
        -------
        str
            Bulk data for request body.

        """
        bulk_lines = []
        operation = json.dumps({'index': {'_index': self._config.index}})

        for event in events:
            bulk_lines.append(operation)
            bulk_lines.append(event)

        return '\n'.join(bulk_lines) + '\n'

    @staticmethod
    def _get_bulk_response_errors(bulk_response: dict) -> list[str]:
        """Get list of errors in bulk response.

        Parameters
        ----------
        bulk_response : dict
            Original response of bulk request.

        Return
        ------
        list[str]
            List of error messages.

        Raises
        ------
        ValueError
            If bulk response has invalid structure.

        """
        if 'errors' not in bulk_response or 'items' not in bulk_response:
            msg = (
                'Invalid bulk response structure, '
                '`errors` and `items` fields must be presented'
            )
            raise ValueError(msg)

        has_errors = bulk_response['errors']

        if not has_errors:
            return []

        items = bulk_response['items']

        errors = []
        try:
            for item in items:
                info = item['index']
                if 'error' in info:
                    error = info['error']
                    errors.append(f'{error["type"]} - {error["reason"]}')
        except KeyError:
            msg = (
                'Invalid bulk response structure, '
                '`type` and `reason` must be presented in error info'
            )
            raise ValueError(msg) from None

        return errors

    async def _post_bulk(self, events: Sequence[str]) -> int:
        """Index events using `_bulk` API.

        Parameters
        ----------
        events : Sequence[str]
            Events to index.

        Returns
        -------
        int
            Number of successfully written events.

        Raises
        ------
        PluginWriteError
            If events indexing fails.

        """
        host = next(self._hosts)

        try:
            response = await self._client.post(
                url=host.join('/_bulk'),
                content=self._create_bulk_data(events),
            )
        except httpx.RequestError as e:
            msg = 'Failed to perform bulk indexing'
            raise PluginWriteError(
                msg,
                context={
                    'reason': str(e),
                    'url': host.host,
                },
            ) from e

        content = await response.aread()
        text = content.decode()

        if response.status_code != 200:  # noqa: PLR2004
            msg = 'Failed to perform bulk indexing'
            raise PluginWriteError(
                msg,
                context={
                    'reason': text,
                    'http_status': response.status_code,
                    'url': host.host,
                },
            )

        try:
            result = json.loads(text)
        except json.JSONDecodeError as e:
            msg = 'Failed to decode bulk response'
            raise PluginWriteError(
                msg,
                context={
                    'reason': str(e),
                    'url': host.host,
                },
            ) from None

        try:
            errors = self._get_bulk_response_errors(result)
        except ValueError as e:
            msg = 'Failed to process bulk response'
            raise PluginWriteError(
                msg,
                context={
                    'reason': str(e),
                    'url': host.host,
                },
            ) from None

        if errors:
            await self._logger.aerror(
                'Some events were not indexed using bulk request',
                reason=f'First 3/{len(errors)} errors are shown: {errors[:3]}',
            )

        return len(events) - len(errors)

    async def _post_doc(self, event: str) -> int:
        """Index event using `_doc` API.

        Parameters
        ----------
        event : str
            Event to index.

        Returns
        -------
        int
            Number of successfully written events (always 1).

        Raises
        ------
        PluginWriteError
            If events indexing fails.

        """
        host = next(self._hosts)

        try:
            response = await self._client.post(
                url=host.join(f'/{self._config.index}/_doc'),
                content=event,
            )
        except httpx.RequestError as e:
            msg = 'Failed to post document'
            raise PluginWriteError(
                msg,
                context={
                    'reason': str(e),
                    'url': host.host,
                },
            ) from e

        if response.status_code != 201:  # noqa: PLR2004
            content = await response.aread()
            text = content.decode()
            msg = 'Failed to post document'
            raise PluginWriteError(
                msg,
                context={
                    'reason': text,
                    'http_status': response.status_code,
                    'url': host.host,
                },
            )

        return 1

    @override
    async def _write(self, events: Sequence[str]) -> int:
        if len(events) > 1:
            return await self._post_bulk(events)
        return await self._post_doc(events[0])
