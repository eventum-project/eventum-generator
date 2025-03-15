"""Definition of clickhouse output plugin."""

import asyncio
import contextlib
import re
from collections.abc import Sequence
from typing import TYPE_CHECKING, override

from clickhouse_connect import get_async_client
from clickhouse_connect.driver.binding import quote_identifier as quote
from clickhouse_connect.driver.summary import QuerySummary

from eventum.plugins.exceptions import PluginRuntimeError
from eventum.plugins.output.base.plugin import OutputPlugin, OutputPluginParams
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

        self._fmt_error_row_pattern = re.compile(r'\(at row (?P<row>\d+)\)')

        self._client: AsyncClient

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
            raise PluginRuntimeError(
                msg,
                context=dict(self.instance_info, reason=str(e)),
            ) from e

        await self._logger.ainfo('ClickHouse client is initialized')

    async def _close(self) -> None:
        await self._client.close()

    async def _write(self, events: Sequence[str]) -> int:
        results = await asyncio.gather(
            *[
                self._client.raw_insert(
                    table=self._fq_table_name,
                    insert_block=event,
                    fmt=self._config.input_format,
                )
                for event in events
            ],
            return_exceptions=True,
        )

        log_tasks: list[asyncio.Task] = []
        written_rows = 0
        for result in results:
            if isinstance(result, QuerySummary):
                written_rows += result.written_rows
            else:
                context = dict(
                    self.instance_info,
                    reason=str(result),
                    host=self._config.host,
                )

                # try to enrich exception with original (formatted) event
                pos_match = re.search(self._fmt_error_row_pattern, str(result))
                if pos_match is not None:
                    row = int(pos_match.group('row'))
                    with contextlib.suppress(IndexError):
                        context.update(formatted_event=events[row - 1])

                log_tasks.append(
                    self._loop.create_task(
                        self._logger.aerror(
                            'Failed to insert events to ClickHouse',
                            **context,
                        ),
                    ),
                )

        await asyncio.gather(*log_tasks)

        return written_rows
