import pytest
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
    ExportLogsServiceRequest,
)
from pydantic import HttpUrl
from pytest_httpx import HTTPXMock

from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.otlp.plugin import OtlpOutputPlugin

_ENDPOINT = 'http://localhost:4318'
_LOGS_URL = 'http://localhost:4318/v1/logs'


def _config(**kwargs) -> OtlpOutputPluginConfig:
    return OtlpOutputPluginConfig(**{'endpoint': HttpUrl(_ENDPOINT), **kwargs})


def _sent_request(httpx_mock: HTTPXMock) -> ExportLogsServiceRequest:
    request = ExportLogsServiceRequest()
    request.ParseFromString(httpx_mock.get_requests()[0].content)

    return request


@pytest.mark.asyncio
async def test_plugin_writes_records(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    await plugin.open()
    written = await plugin.write(['{"message": "hi"}', '{"message": "bye"}'])
    await plugin.close()

    assert written == 2

    records = (
        _sent_request(httpx_mock).resource_logs[0].scope_logs[0].log_records
    )
    assert [record.body.string_value for record in records] == [
        '{"message": "hi"}',
        '{"message": "bye"}',
    ]


@pytest.mark.asyncio
async def test_plugin_counts_failed_request(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=400, text='bad')

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    await plugin.open()
    written = await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    assert written == 0
    assert plugin.write_failed == 1
    assert len(httpx_mock.get_requests()) == 1


@pytest.mark.asyncio
async def test_plugin_appends_logs_path_once(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(endpoint=HttpUrl(_LOGS_URL)),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"a": 1}'])
    await plugin.close()

    assert str(httpx_mock.get_requests()[0].url) == _LOGS_URL
