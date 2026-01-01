"""Definition of http output plugin."""

import asyncio
from collections.abc import Sequence
from typing import override

import httpx

from eventum.plugins.exceptions import PluginConfigurationError
from eventum.plugins.output.base.plugin import OutputPlugin, OutputPluginParams
from eventum.plugins.output.exceptions import PluginWriteError
from eventum.plugins.output.http_client import (
    create_client,
    create_ssl_context,
)
from eventum.plugins.output.plugins.http.config import HttpOutputPluginConfig


class HttpOutputPlugin(
    OutputPlugin[HttpOutputPluginConfig, OutputPluginParams],
):
    """Output plugin for sending events using HTTP requests."""

    @override
    def __init__(
        self,
        config: HttpOutputPluginConfig,
        params: OutputPluginParams,
    ) -> None:
        super().__init__(config, params)

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
            headers=self._config.headers,
            connect_timeout=self._config.connect_timeout,
            request_timeout=self._config.request_timeout,
            proxy_url=(
                str(self._config.proxy_url) if self._config.proxy_url else None
            ),
        )

    @override
    async def _close(self) -> None:
        await self._client.aclose()

    async def _perform_request(self, data: str) -> None:
        """Perform request with provided data.

        Parameters
        ----------
        data : str
            Data for request.

        Raises
        ------
        PluginWriteError
            If request failed or response status code differs from
            expected one.

        """
        try:
            response = await self._client.request(
                method=self._config.method,
                url=str(self._config.url),
                content=data,
            )
        except httpx.RequestError as e:
            msg = 'Request failed'
            raise PluginWriteError(
                msg,
                context={
                    'reason': str(e),
                    'url': str(self._config.url),
                },
            ) from e

        if response.status_code != self._config.success_code:
            content = await response.aread()
            text = content.decode()
            msg = 'Server returned not expected status code'
            raise PluginWriteError(
                msg,
                context={
                    'http_status': response.status_code,
                    'reason': text,
                    'url': str(self._config.url),
                },
            )

    @override
    async def _write(self, events: Sequence[str]) -> int:
        results = await asyncio.gather(
            *[
                self._loop.create_task(self._perform_request(event))
                for event in events
            ],
            return_exceptions=True,
        )

        log_tasks: list[asyncio.Task] = []
        for result in results:
            if isinstance(result, PluginWriteError):
                log_tasks.append(
                    self._loop.create_task(
                        self._logger.aerror(str(result), **result.context),
                    ),
                )
            elif isinstance(result, BaseException):
                log_tasks.append(
                    self._loop.create_task(
                        self._logger.aerror(
                            'Failed to perform request',
                            reason=str(result),
                            url=str(self._config.url),
                        ),
                    ),
                )

        errors_count = len(log_tasks)

        await asyncio.gather(*log_tasks)

        return len(events) - errors_count
