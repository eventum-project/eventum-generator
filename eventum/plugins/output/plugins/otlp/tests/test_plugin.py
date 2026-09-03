import gzip
import json

import pytest
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
    ExportLogsServiceRequest,
)
from pydantic import HttpUrl
from pytest_httpx import HTTPXMock

from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.otlp.plugin import (
    OtlpOutputPlugin,
    build_logs_url,
)

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


def test_build_logs_url_appends_path_before_query():
    assert (
        build_logs_url('http://localhost:4318/?api-key=secret')
        == 'http://localhost:4318/v1/logs?api-key=secret'
    )


@pytest.mark.asyncio
async def test_plugin_names_the_generator_as_the_service(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(),
        params={'id': 1, 'generator_id': 'linux-syslog'},
    )

    await plugin.open()
    await plugin.write(['{"a": 1}'])
    await plugin.close()

    resource = _sent_request(httpx_mock).resource_logs[0].resource
    attributes = {kv.key: kv.value.string_value for kv in resource.attributes}

    assert attributes['service.name'] == 'linux-syslog'
    assert attributes['telemetry.sdk.name'] == 'eventum'
    assert attributes['telemetry.sdk.language'] == 'python'


@pytest.mark.asyncio
async def test_plugin_falls_back_to_default_service_name(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    await plugin.open()
    await plugin.write(['{"a": 1}'])
    await plugin.close()

    resource = _sent_request(httpx_mock).resource_logs[0].resource
    attributes = {kv.key: kv.value.string_value for kv in resource.attributes}

    assert attributes['service.name'] == 'eventum'


@pytest.mark.asyncio
async def test_plugin_config_resource_attributes_override_defaults(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(resource_attributes={'service.name': 'custom'}),
        params={'id': 1, 'generator_id': 'linux-syslog'},
    )

    await plugin.open()
    await plugin.write(['{"a": 1}'])
    await plugin.close()

    resource = _sent_request(httpx_mock).resource_logs[0].resource
    attributes = {kv.key: kv.value.string_value for kv in resource.attributes}

    assert attributes['service.name'] == 'custom'


@pytest.mark.asyncio
async def test_plugin_groups_records_by_configured_resource_field(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(
            resource_attributes_from={'host.name': 'host.name'},
        ),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(
        [
            '{"host": {"name": "srv-1"}}',
            '{"host": {"name": "srv-2"}}',
        ],
    )
    await plugin.close()

    resource_logs = _sent_request(httpx_mock).resource_logs
    assert len(resource_logs) == 2


@pytest.mark.asyncio
async def test_plugin_sends_json_when_configured(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(protocol='http/json'),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert request.headers['content-type'] == 'application/json'

    payload = json.loads(request.content)
    record = payload['resourceLogs'][0]['scopeLogs'][0]['logRecords'][0]
    assert record['body']['stringValue'] == '{"message": "hi"}'


@pytest.mark.asyncio
async def test_plugin_sends_compact_json(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(protocol='http/json'),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert b'\n' not in request.content


@pytest.mark.asyncio
async def test_plugin_compresses_when_configured(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(compression='gzip'),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert request.headers['content-encoding'] == 'gzip'

    decoded = ExportLogsServiceRequest()
    decoded.ParseFromString(gzip.decompress(request.content))
    records = decoded.resource_logs[0].scope_logs[0].log_records
    assert records[0].body.string_value == '{"message": "hi"}'


@pytest.mark.asyncio
async def test_plugin_exporter_headers_win_over_user_headers(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(
            protocol='http/json',
            compression='gzip',
            headers={
                'Content-Type': 'text/plain',
                'Content-Encoding': 'br',
            },
        ),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert request.headers['content-type'] == 'application/json'
    assert request.headers['content-encoding'] == 'gzip'
