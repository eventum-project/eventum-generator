"""Helper functions for http based output plugins."""

import ssl
from pathlib import Path
from typing import Any

import httpx


def create_ssl_context(
    *,
    verify: bool,
    ca_cert: Path | None = None,
    client_cert: Path | None = None,
    client_key: Path | None = None,
) -> ssl.SSLContext:
    """Create initialized SSL context.

    Parameters
    ----------
    verify : bool
        Wether to verify certificates.

    ca_cert : Path | None, default=None
        Path to CA certificate.

    client_cert : Path | None, default=None
        Path to client certificate.

    client_key : Path | None, default=None
        Path to client certificate key.

    Returns
    -------
    ssl.SSLContext
        Initialized SSL context.

    Raises
    ------
    OSError
        If error occurs during reading certificates.

    ValueError:
        If client cert is provided but client key is not or vise versa.

    """
    context = ssl.create_default_context()

    if not verify:
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

    if ca_cert is not None:
        try:
            context.load_verify_locations(cafile=ca_cert)
        except ssl.SSLError as e:
            msg = f'Invalid CA certificate: {e}'
            raise OSError(msg) from e
        except OSError as e:
            msg = f'Failed to load CA certificate: {e}'
            raise OSError(msg) from e

    if client_cert is not None or client_key is not None:
        if client_cert is None or client_key is None:
            msg = 'Client certificate and key must be provided together'
            raise ValueError(msg)

        try:
            context.load_cert_chain(certfile=client_cert, keyfile=client_key)
        except ssl.SSLError as e:
            msg = f'Invalid client certificate or key: {e}'
            raise OSError(msg) from e
        except OSError as e:
            msg = f'Failed to load client certificate or key: {e}'
            raise OSError(msg) from e

    return context


def create_client(  # noqa: PLR0913
    ssl_context: ssl.SSLContext | None = None,
    username: str | None = None,
    password: str | None = None,
    headers: dict[str, Any] | None = None,
    connect_timeout: int = 10,
    request_timeout: int = 300,
    proxy_url: str | None = None,
) -> httpx.AsyncClient:
    """Create HTTP client with initialized parameters.

    Parameters
    ----------
    ssl_context : ssl.SSLContext | None, default=None
        SSL context for session.

    username : str | None, default=None
        Username used in basic auth.

    password : str | None, default=None
        Password for user used in basic auth, can be `None` with
        provided `username` (in this case empty string will be used).

    headers : dict[str, Any] | None, default=None
        Headers to set in session.

    connect_timeout : int, default=10
        Timeout of connection to host.

    request_timeout : int, default=300
        Timeout of requests.

    proxy_url : str | None, default=None
        Proxy url.

    Returns
    -------
    httpx.AsyncClient
        Initialized HTTP client.

    """
    ssl_context = ssl_context or ssl.create_default_context()

    if username is None:
        auth: httpx.BasicAuth | None = None
    else:
        auth = httpx.BasicAuth(username, password or '')

    if proxy_url is None:
        proxy: httpx.Proxy | None = None
    else:
        proxy = httpx.Proxy(proxy_url)

    return httpx.AsyncClient(
        auth=auth,
        headers=headers,
        verify=ssl_context,
        timeout=httpx.Timeout(request_timeout, connect=connect_timeout),
        proxy=proxy,
    )
