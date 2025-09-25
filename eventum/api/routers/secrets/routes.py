"""Routes."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Body, HTTPException, Path

from eventum.security.manage import get_secret, remove_secret, set_secret

router = APIRouter()


@router.get(
    '/{name}',
    description='Get secret with specified name from keyring',
    response_description='Secret value',
    responses={
        404: {'description': 'Secret is missing in keyring'},
        500: {'description': 'Failed to obtain secret'},
    },
)
async def get_secret_value(
    name: Annotated[str, Path(description='Secret name', min_length=1)],
) -> str:
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(
            executor=None,
            func=lambda: get_secret(name=name),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        ) from None
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f'Failed to obtain secret: {e}',
        ) from None


@router.put(
    '/{name}',
    description='Put secret with specified name to keyring',
    responses={500: {'description': 'Failed to set secret'}},
)
async def set_secret_value(
    name: Annotated[str, Path(description='Secret name', min_length=1)],
    value: Annotated[str, Body(description='Secret value', min_length=1)],
) -> None:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            executor=None,
            func=lambda: set_secret(name=name, value=value),
        )

    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f'Failed to set secret: {e}',
        ) from None


@router.delete(
    '/{name}',
    description='Delete secret with specified name to keyring',
    responses={500: {'description': 'Failed to remove secret'}},
)
async def delete_secret_value(
    name: Annotated[str, Path(description='Secret name', min_length=1)],
) -> None:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            executor=None,
            func=lambda: remove_secret(name=name),
        )
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f'Failed to remove secret: {e}',
        ) from None
