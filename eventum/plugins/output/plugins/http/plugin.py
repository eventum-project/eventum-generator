import asyncio
from typing import Sequence

import httpx

from eventum.plugins.exceptions import (PluginConfigurationError,
                                        PluginRuntimeError)
from eventum.plugins.output.base.plugin import OutputPlugin, OutputPluginParams
from eventum.plugins.output.http_client import (create_client,
                                                create_ssl_context)
from eventum.plugins.output.plugins.http.config import HttpOutputPluginConfig


class HttpOutputPlugin(
    OutputPlugin[HttpOutputPluginConfig, OutputPluginParams]
):
    """Output plugin for indexing events to OpenSearch."""

    def __init__(
        self,
        config: HttpOutputPluginConfig,
        params: OutputPluginParams
    ) -> None:
        super().__init__(config, params)

        try:
            self._ssl_context = create_ssl_context(
                verify=config.verify,
                ca_cert=config.ca_cert,
                client_cert=config.client_cert,
                client_key=config.client_cert_key
            )
        except OSError as e:
            raise PluginConfigurationError(
                'Failed to create SSL context',
                context=dict(self.instance_info, reason=str(e))
            )

        self._client: httpx.AsyncClient

    async def _open(self) -> None:
        self._client = create_client(
            ssl_context=self._ssl_context,
            username=self._config.username,
            password=self._config.password,
            headers=self._config.headers,
            connect_timeout=self._config.connect_timeout,
            request_timeout=self._config.request_timeout,
            proxy_url=(
                str(self._config.proxy_url) if self._config.proxy_url
                else None
            )
        )

    async def _close(self) -> None:
        await self._client.aclose()

    async def _perform_request(self, data: str) -> None:
        """Perform request with provided data.

        Parameters
        ----------
        data : str
            Data for request

        Raises
        ------
        PluginRuntimeError
            If request failed or response status code differs from
            expected one
        """
        try:
            response = await self._client.request(
                method=self._config.method,
                url=str(self._config.url),
                content=data
            )
        except httpx.RequestError as e:
            raise PluginRuntimeError(
                'Request failed',
                context=dict(
                    self.instance_info,
                    reason=str(e),
                    url=self._config.url
                )
            ) from e

        if response.status_code != self._config.success_code:
            content = await response.aread()
            text = content.decode()
            raise PluginRuntimeError(
                'Server returned not expected status code',
                context=dict(
                    self.instance_info,
                    http_status=response.status_code,
                    reason=text,
                    url=self._config.url
                )
            )

    async def _write(self, events: Sequence[str]) -> int:
        results = await asyncio.gather(
            *[
                self._loop.create_task(self._perform_request(event))
                for event in events
            ],
            return_exceptions=True
        )

        errors: list[PluginRuntimeError] = []
        unexpected_errors: list[Exception] = []

        for result in results:
            if isinstance(result, PluginRuntimeError):
                errors.append(result)
            elif isinstance(result, Exception):
                unexpected_errors.append(result)

        if errors:
            await asyncio.gather(
                *[
                    self._logger.aerror(str(error), **error.context)
                    for error in errors
                ]
            )

        if unexpected_errors:
            raise PluginRuntimeError(
                'Error during performing request',
                context=dict(
                    self.instance_info,
                    reason=(
                        f'First 3/{len(unexpected_errors)} errors are shown: '
                        f'{unexpected_errors[:3]}'
                    )
                )
            )

        return len(events) - len(errors)
