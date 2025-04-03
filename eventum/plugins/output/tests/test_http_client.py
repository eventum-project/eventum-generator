import ssl
from pathlib import Path

import httpx
import pytest

from eventum.plugins.output.http_client import (
    create_client,
    create_ssl_context,
)


def test_create_ssl_context_no_verify():
    context = create_ssl_context(verify=False)
    assert context.verify_mode == ssl.CERT_NONE
    assert not context.check_hostname


def test_create_ssl_context_verify():
    context = create_ssl_context(verify=True)
    assert context.verify_mode != ssl.CERT_NONE
    assert context.check_hostname


def test_create_ssl_context_client_cert_missing_key():
    with pytest.raises(ValueError):
        create_ssl_context(verify=True, client_cert=Path('path/to/cert.pem'))


def test_create_ssl_context_client_key_missing_cert():
    with pytest.raises(ValueError):
        create_ssl_context(verify=True, client_key=Path('path/to/key.pem'))


@pytest.mark.asyncio
async def test_create_client_default():
    client = create_client()
    assert isinstance(client, httpx.AsyncClient)
    assert client.auth is None
    await client.aclose()


@pytest.mark.asyncio
async def test_create_client_with_auth():
    client = create_client(username='user', password='pass')
    assert isinstance(client.auth, httpx.BasicAuth)
    await client.aclose()


@pytest.mark.asyncio
async def test_create_client_with_headers():
    headers = {'User-Agent': 'TestClient'}
    client = create_client(headers=headers)
    assert client.headers['User-Agent'] == 'TestClient'
    await client.aclose()
