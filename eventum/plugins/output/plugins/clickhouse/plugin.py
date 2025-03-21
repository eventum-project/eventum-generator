"""Definition of clickhouse output plugin."""

from collections.abc import Sequence
from typing import TYPE_CHECKING, override

from clickhouse_connect import get_async_client
from clickhouse_connect.driver.binding import quote_identifier as quote

from eventum.plugins.output.base.plugin import OutputPlugin, OutputPluginParams
from eventum.plugins.output.exceptions import PluginWriteError
from eventum.plugins.output.plugins.clickhouse.config import (
    ClickhouseOutputPluginConfig,
)

if TYPE_CHECKING:
    from clickhouse_connect.driver.asyncclient import AsyncClient


class ClickhouseOutputPlugin(
    OutputPlugin[ClickhouseOutputPluginConfig, OutputPluginParams],
):
    """Output plugin for indexing events to OpenSearch."""

    @override
    def __init__(
        self,
        config: ClickhouseOutputPluginConfig,
        params: OutputPluginParams,
    ) -> None:
        super().__init__(config, params)

        self._fq_table_name = '.'.join(
            [quote(config.database), quote(config.table)],
        )
        self._client: AsyncClient

    @override
    async def _open(self) -> None:
        try:
            self._client = await get_async_client(
                host=self._config.host,
                port=self._config.port,
                interface=self._config.protocol,
                database=self._config.database,
                username=self._config.username,
                password=self._config.password,
                dsn=str(self._config.dsn) if self._config.dsn else None,
                connect_timeout=self._config.connect_timeout,
                send_receive_timeout=self._config.request_timeout,
                client_name=self._config.client_name,
                verify=self._config.verify,
                ca_cert=self._config.ca_cert,
                client_cert=self._config.client_cert,
                client_cert_key=self._config.client_cert_key,
                server_host_name=self._config.server_host_name,
                tls_mode=self._config.tls_mode,
                http_proxy=(
                    str(self._config.proxy_url)
                    if self._config.proxy_url
                    else None
                ),
                https_proxy=(
                    str(self._config.proxy_url)
                    if self._config.proxy_url
                    else None
                ),
            )
        except Exception as e:
            msg = 'Cannot initialize ClickHouse client'
            raise PluginWriteError(
                msg,
                context={'reason': str(e)},
            ) from e

        await self._logger.ainfo('ClickHouse client is initialized')

    @override
    async def _close(self) -> None:
        await self._client.close()

    @override
    async def _write(self, events: Sequence[str]) -> int:
        try:
            result = await self._client.raw_insert(
                table=self._fq_table_name,
                insert_block=(
                    self._config.header
                    + self._config.separator.join(events)
                    + self._config.footer
                ),
                fmt=self._config.input_format,
            )
        except Exception as e:
            msg = 'Failed to insert events to ClickHouse'
            raise PluginWriteError(
                msg,
                context={
                    'reason': str(e),
                    'host': self._config.host,
                },
            ) from e
        else:
            return result.written_rows
