"""Authorization dependencies."""

import base64
import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.security.utils import get_authorization_scheme_param

from eventum.api.dependencies.app import SettingsDep

security = HTTPBasic()


def check_http_credentials(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    settings: SettingsDep,
) -> None:
    """Check if http credentials are valid.

    Parameters
    ----------
    credentials : HTTPBasicCredentials
        Provided credentials.

    settings : SettingsDep
        Settings dependency with correct user and password.

    Raises
    ------
    HTTPException
        If username or password are incorrect.

    """
    is_correct_username = secrets.compare_digest(
        credentials.username.encode(),
        settings.api.auth.user.encode(),
    )

    is_correct_password = secrets.compare_digest(
        credentials.password.encode(),
        settings.api.auth.password.encode(),
    )

    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect username or password',
            headers={'WWW-Authenticate': 'Basic'},
        )


HttpAuthDepends = Depends(check_http_credentials)
HttpAuthDep = Annotated[None, HttpAuthDepends]


def check_websocket_credentials(
    websocket: WebSocket,
    settings: SettingsDep,
) -> None:
    """Check if websocket credentials are valid.

    Parameters
    ----------
    websocket : WebSocket
        Websocket connection.

    settings : SettingsDep
        Settings dependency with correct user and password.

    Raises
    ------
    HTTPException
        If username or password are incorrect or Authorization header
        is not provided.

    Notes
    -----
    HTTPException is raised instead of WebSocketException due to at the
    moment of authorization we do not accept websocket connection and
    still in HTTP upgrade phase.

    """
    auth_header = websocket.headers.get('Authorization')

    if auth_header is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authorization header must be provided',
        )
    scheme, param = get_authorization_scheme_param(auth_header)

    if scheme != 'Basic':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f'{scheme} authorization is not supported',
        )

    decoded = base64.b64decode(param).decode()
    username, _, password = decoded.partition(':')

    is_correct_username = secrets.compare_digest(
        username.encode(),
        settings.api.auth.user.encode(),
    )

    is_correct_password = secrets.compare_digest(
        password.encode(),
        settings.api.auth.password.encode(),
    )

    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect username or password',
        )


WebsocketAuthDepends = Depends(check_websocket_credentials)
WebsocketAuthDep = Annotated[None, WebsocketAuthDepends]
