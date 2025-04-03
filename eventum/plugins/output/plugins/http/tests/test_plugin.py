import re

import pytest
from pydantic import HttpUrl
from pytest_httpx import HTTPXMock

from eventum.plugins.output.fields import Format, JsonFormatterConfig
from eventum.plugins.output.plugins.http.config import HttpOutputPluginConfig
from eventum.plugins.output.plugins.http.plugin import HttpOutputPlugin


@pytest.mark.asyncio
async def test_plugin_write(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        method='POST',
        url=re.compile(r'http://localhost:8000/.*'),
        status_code=201,
        text='Ok.',
    )

    config = HttpOutputPluginConfig(
        url=HttpUrl('http://localhost:8000/endpoint'),  # type: ignore
        headers={'Content-Type': 'application/json'},
        formatter=JsonFormatterConfig(format=Format.JSON, indent=0),
    )
    plugin = HttpOutputPlugin(config=config, params={'id': 1})

    await plugin.open()

    written = await plugin.write(
        events=['{"@timestamp": "2024-01-01T00:00:00.000Z", "value": 1}']
    )
    await plugin.close()

    requests = httpx_mock.get_requests()
    assert len(requests) == 1

    rq = requests[0]
    assert rq.method == 'POST'
    assert str(rq.url) == 'http://localhost:8000/endpoint'
    assert rq.read().decode() == (
        '{"@timestamp": "2024-01-01T00:00:00.000Z", "value": 1}'
    )
    assert written == 1


@pytest.mark.asyncio
async def test_plugin_wrong_code(httpx_mock: HTTPXMock):
    httpx_mock.add_response(
        method='POST',
        url=re.compile(r'http://localhost:8000/.*'),
        status_code=200,
        text='Ok.',
    )

    config = HttpOutputPluginConfig(
        url=HttpUrl('http://localhost:8000/endpoint'),  # type: ignore
        headers={'Content-Type': 'application/json'},
        formatter=JsonFormatterConfig(format=Format.JSON, indent=0),
    )
    plugin = HttpOutputPlugin(config=config, params={'id': 1})

    await plugin.open()

    written = await plugin.write(
        events=['{"@timestamp": "2024-01-01T00:00:00.000Z", "value": 1}']
    )
    await plugin.close()

    requests = httpx_mock.get_requests()
    assert len(requests) == 1

    rq = requests[0]
    assert rq.method == 'POST'
    assert str(rq.url) == 'http://localhost:8000/endpoint'
    assert rq.read().decode() == (
        '{"@timestamp": "2024-01-01T00:00:00.000Z", "value": 1}'
    )
    assert written == 0
