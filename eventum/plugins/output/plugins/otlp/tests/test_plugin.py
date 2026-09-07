import asyncio
import gzip
import json
from base64 import b64encode

import httpx
import pytest
import structlog
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
    ExportLogsServiceRequest,
    ExportLogsServiceResponse,
)
from pydantic import HttpUrl
from pytest_httpx import HTTPXMock

from eventum.plugins.output.exceptions import PluginOpenError, PluginWriteError
from eventum.plugins.output.http_auth import authenticators
from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.otlp.plugin import (
    OtlpOutputPlugin,
    build_logs_url,
)

_ENDPOINT = 'http://localhost:4318'
_LOGS_URL = 'http://localhost:4318/v1/logs'
_TOKEN_URL = 'https://login.example.com/token'  # noqa: S105
_UNAUTHORIZED = 401
_BAD_REQUEST = 400


def _config(**kwargs) -> OtlpOutputPluginConfig:
    return OtlpOutputPluginConfig(**{'endpoint': HttpUrl(_ENDPOINT), **kwargs})


def _oauth2_auth() -> dict:
    """Build an auth section pointing at the mocked token endpoint."""
    return {
        'type': 'oauth2_client_credentials',
        'token_url': _TOKEN_URL,
        'client_id': 'id',
        'client_secret': 'secret',
    }


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
async def test_plugin_splits_oversized_write(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200, is_reusable=True)

    event = '{"blob": "' + 'x' * 2000 + '"}'
    plugin = OtlpOutputPlugin(
        config=_config(max_request_bytes=8000),
        params={'id': 1},
    )

    await plugin.open()
    written = await plugin.write([event] * 10)
    await plugin.close()

    assert written == 10
    assert len(httpx_mock.get_requests()) > 1


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


@pytest.mark.asyncio
async def test_plugin_drops_user_content_encoding_when_not_compressing(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(
            compression='none',
            headers={'Content-Encoding': 'gzip'},
        ),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert 'content-encoding' not in request.headers

    records = (
        _sent_request(httpx_mock).resource_logs[0].scope_logs[0].log_records
    )
    assert records[0].body.string_value == '{"message": "hi"}'


@pytest.mark.asyncio
async def test_plugin_drops_lowercase_user_content_encoding(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(
            compression='none',
            headers={'content-encoding': 'gzip'},
        ),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert 'content-encoding' not in request.headers

    records = (
        _sent_request(httpx_mock).resource_logs[0].scope_logs[0].log_records
    )
    assert records[0].body.string_value == '{"message": "hi"}'


@pytest.mark.asyncio
async def test_plugin_overrides_lowercase_user_content_type(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(
            protocol='http/json',
            headers={'content-type': 'text/plain'},
        ),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi"}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert request.headers['content-type'] == 'application/json'


@pytest.mark.asyncio
async def test_plugin_subtracts_rejected_records(httpx_mock: HTTPXMock):
    response = ExportLogsServiceResponse()
    response.partial_success.rejected_log_records = 1
    response.partial_success.error_message = 'one dropped'

    httpx_mock.add_response(
        url=_LOGS_URL,
        status_code=200,
        content=response.SerializeToString(),
    )

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"b": 2}'])
    await plugin.close()

    assert written == 1
    assert plugin.write_failed == 1


@pytest.mark.asyncio
async def test_plugin_treats_empty_body_as_full_success(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200, content=b'')

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    await plugin.open()
    written = await plugin.write(['{"a": 1}'])
    await plugin.close()

    assert written == 1


@pytest.mark.asyncio
async def test_plugin_reports_failures_grouped(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=_LOGS_URL,
        status_code=503,
        text='unavailable',
        is_reusable=True,
    )

    plugin = OtlpOutputPlugin(
        config=_config(max_request_bytes=8000),
        params={'id': 1},
    )

    event = '{"blob": "' + 'x' * 2000 + '"}'

    with structlog.testing.capture_logs() as logged:
        await plugin.open()
        written = await plugin.write([event] * 10)
        await plugin.close()

    assert written == 0
    assert len(httpx_mock.get_requests()) > 1
    errors = [entry for entry in logged if entry.get('http_status') == 503]
    assert len(errors) == 1
    assert errors[0]['count'] == 10


@pytest.mark.asyncio
async def test_plugin_logs_partial_success_once(httpx_mock: HTTPXMock):
    response = ExportLogsServiceResponse()
    response.partial_success.rejected_log_records = 3
    response.partial_success.error_message = 'three dropped'

    httpx_mock.add_response(
        url=_LOGS_URL,
        status_code=200,
        content=response.SerializeToString(),
    )

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    with structlog.testing.capture_logs() as logged:
        await plugin.open()
        await plugin.write(['{"a": 1}'] * 5)
        await plugin.close()

    partial = [
        entry
        for entry in logged
        if entry['event'] == 'OTLP receiver reported a partial success'
    ]
    assert len(partial) == 1
    assert partial[0]['count'] == 3
    assert partial[0]['reason'] == 'three dropped'


@pytest.mark.asyncio
async def test_plugin_logs_no_partial_success_when_fully_accepted(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    with structlog.testing.capture_logs() as logged:
        await plugin.open()
        await plugin.write(['{"a": 1}'])
        await plugin.close()

    partial = [
        entry
        for entry in logged
        if entry['event'] == 'OTLP receiver reported a partial success'
    ]
    assert len(partial) == 0


@pytest.mark.asyncio
async def test_plugin_wraps_a_mapping_failure_as_write_error(
    httpx_mock: HTTPXMock,
):
    # A lone surrogate is invalid Unicode: constructing the record's
    # body raises inside the mapping path, before any request exists.
    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    await plugin.open()
    with pytest.raises(PluginWriteError) as exc_info:
        await plugin.write(['plain line with \ud800 inside'])
    await plugin.close()

    assert exc_info.value.context['reason']
    assert len(httpx_mock.get_requests()) == 0


@pytest.mark.asyncio
async def test_plugin_reports_unexpected_send_failure_instead_of_raising(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_exception(RuntimeError('boom'), url=_LOGS_URL)
    httpx_mock.add_response(url=_LOGS_URL, status_code=200, is_reusable=True)

    event = '{"blob": "' + 'x' * 2000 + '"}'
    plugin = OtlpOutputPlugin(
        config=_config(max_request_bytes=8000),
        params={'id': 1},
    )

    with structlog.testing.capture_logs() as logged:
        await plugin.open()
        written = await plugin.write([event] * 10)
        await plugin.close()

    assert len(httpx_mock.get_requests()) > 1

    errors = [
        entry
        for entry in logged
        if entry['event'] == 'Failed to send request to OTLP receiver'
    ]
    assert len(errors) == 1
    failed_count = errors[0]['count']
    assert 0 < failed_count < 10
    assert written == 10 - failed_count


@pytest.mark.asyncio
async def test_plugin_wires_timestamp_and_severity_from_config(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    await plugin.open()
    await plugin.write(
        [
            '{"@timestamp": "2026-02-25T07:43:45.123456+00:00",'
            ' "log": {"level": "warn"}}',
        ],
    )
    await plugin.close()

    scope_logs = _sent_request(httpx_mock).resource_logs[0].scope_logs[0]
    record = scope_logs.log_records[0]

    assert record.time_unix_nano == 1_772_005_425_123_456_000
    assert record.severity_number == 13  # noqa: PLR2004
    assert record.severity_text == 'warn'


@pytest.mark.asyncio
async def test_plugin_wires_body_field_and_flatten_attributes_from_config(
    httpx_mock: HTTPXMock,
):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(
            body_field='message',
            flatten_attributes=False,
            severity_field=None,
        ),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"message": "hi", "log": {"level": "warn"}}'])
    await plugin.close()

    scope_logs = _sent_request(httpx_mock).resource_logs[0].scope_logs[0]
    record = scope_logs.log_records[0]

    assert record.body.string_value == 'hi'

    attributes = {kv.key: kv.value for kv in record.attributes}
    nested = attributes['log'].kvlist_value.values
    assert nested[0].key == 'level'
    assert nested[0].value.string_value == 'warn'


@pytest.mark.asyncio
async def test_plugin_reports_unparsable_success_body(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        url=_LOGS_URL,
        status_code=200,
        content=b'\xff\xff\xff',
    )

    plugin = OtlpOutputPlugin(config=_config(), params={'id': 1})

    with structlog.testing.capture_logs() as logged:
        await plugin.open()
        written = await plugin.write(['{"a": 1}'])
        await plugin.close()

    assert written == 1

    warnings = [
        entry for entry in logged if 'could not be parsed' in entry['event']
    ]
    assert len(warnings) == 1
    assert warnings[0]['count'] == 1


@pytest.mark.asyncio
async def test_plugin_sends_static_bearer_token(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(auth={'type': 'bearer', 'token': 'abc'}),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"a": 1}'])
    await plugin.close()

    request = httpx_mock.get_requests()[0]
    assert request.headers['Authorization'] == 'Bearer abc'


@pytest.mark.asyncio
async def test_plugin_sends_basic_credentials(httpx_mock: HTTPXMock):
    httpx_mock.add_response(url=_LOGS_URL, status_code=200)

    plugin = OtlpOutputPlugin(
        config=_config(
            auth={'type': 'basic', 'username': 'user', 'password': 'pass'},
        ),
        params={'id': 1},
    )

    await plugin.open()
    await plugin.write(['{"a": 1}'])
    await plugin.close()

    expected = b64encode(b'user:pass').decode()
    request = httpx_mock.get_requests()[0]
    assert request.headers['Authorization'] == f'Basic {expected}'


@pytest.mark.asyncio
async def test_plugin_refreshes_token_on_unauthorized(
    httpx_mock: HTTPXMock,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        authenticators,
        'MIN_REJECTED_TOKEN_AGE_SECONDS',
        0.0,
    )
    tokens = iter(['stale', 'fresh'])
    httpx_mock.add_callback(
        lambda _request: httpx.Response(
            status_code=200,
            json={'access_token': next(tokens), 'expires_in': 3600},
        ),
        method='POST',
        url=_TOKEN_URL,
        is_reusable=True,
    )
    httpx_mock.add_callback(
        lambda request: httpx.Response(
            status_code=(
                200
                if request.headers['Authorization'] == 'Bearer fresh'
                else _UNAUTHORIZED
            ),
        ),
        url=_LOGS_URL,
        is_reusable=True,
    )

    plugin = OtlpOutputPlugin(
        config=_config(auth=_oauth2_auth()),
        params={'id': 1},
    )

    await plugin.open()
    written = await plugin.write(['{"a": 1}'])
    await plugin.close()

    assert written == 1
    assert plugin.write_failed == 0


@pytest.mark.asyncio
async def test_plugin_fails_to_open_without_a_token(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        method='POST',
        url=_TOKEN_URL,
        status_code=_BAD_REQUEST,
        text='invalid_client',
    )

    plugin = OtlpOutputPlugin(
        config=_config(auth=_oauth2_auth()),
        params={'id': 1},
    )

    with pytest.raises(PluginOpenError) as info:
        await plugin.open()

    assert info.value.context['http_status'] == _BAD_REQUEST


@pytest.mark.asyncio
async def test_plugin_reports_authentication_failure_while_sending(
    httpx_mock: HTTPXMock,
):
    # the token minted at open time expires almost immediately, so the
    # write below asks the token endpoint again and meets its failure
    answers = iter(
        [
            httpx.Response(
                status_code=200,
                json={'access_token': 'tok', 'expires_in': 0.001},
            ),
        ],
    )
    httpx_mock.add_callback(
        lambda _request: next(
            answers,
            httpx.Response(status_code=_BAD_REQUEST, text='invalid_client'),
        ),
        method='POST',
        url=_TOKEN_URL,
        is_reusable=True,
    )

    plugin = OtlpOutputPlugin(
        config=_config(auth=_oauth2_auth()),
        params={'id': 1},
    )

    await plugin.open()
    await asyncio.sleep(0.01)
    written = await plugin.write(['{"a": 1}'])
    await plugin.close()

    assert written == 0
    assert plugin.write_failed == 1
    assert len(httpx_mock.get_requests(url=_LOGS_URL)) == 0
