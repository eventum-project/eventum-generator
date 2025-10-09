"""Routes."""

import secrets
from typing import Annotated

from fastapi import APIRouter, Request, Response, Security
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from eventum.api.dependencies.app import SettingsDep
from eventum.api.dependencies.authentication import (
    check_auth,
    clear_session,
    set_session,
)

router = APIRouter()
security = HTTPBasic()


@router.post(
    '/login',
    description=(
        'Authenticate user via basic auth and create a server-side session '
        'with a HttpOnly cookie'
    ),
    responses={401: {'description': 'Unauthorized'}},
)
async def login(
    _: Annotated[HTTPBasicCredentials, Security(security)],
    request: Request,
    response: Response,
    settings: SettingsDep,
) -> str:
    username = check_auth(context=request, settings=settings)

    session_id = secrets.token_hex(16)

    set_session(session_id, username)

    response.set_cookie(
        key='session_id',
        value=session_id,
        httponly=True,
        secure=False,
    )

    return session_id


@router.post(
    '/logout',
    description='Clear user session',
)
async def logout(
    request: Request,
    response: Response,
) -> None:
    session_id = request.cookies.get('session_id')

    if session_id is None:
        return

    clear_session(session_id)

    response.delete_cookie(
        key='session_id',
        httponly=True,
        secure=False,
    )
