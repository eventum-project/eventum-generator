"""Routes."""

import asyncio
from typing import Annotated

import aiofiles
import yaml
from fastapi import APIRouter, Body, HTTPException, status

from eventum.api.dependencies.app import InstanceHooksDep, SettingsDep
from eventum.api.routers.instance.models import InstanceInfo
from eventum.app.models.settings import Settings

router = APIRouter()


@router.get('/info', description='Information about app and host')
async def get_info() -> InstanceInfo:
    # InstanceInfo actively uses syscalls that can potentially block event loop
    return await asyncio.to_thread(InstanceInfo)


@router.get(
    '/settings',
    description='Get settings',
    response_description='Current settings of the application',
)
async def get_settings(settings: SettingsDep) -> Settings:
    return settings


@router.put(
    '/settings',
    description=(
        'Update settings. Note that this only updates file.'
        ' For changes to take effect u have to restart instance.'
    ),
)
async def update_settings(
    settings: Annotated[Settings, Body(description='New settings')],
    hooks: InstanceHooksDep,
) -> None:
    try:
        path = await asyncio.to_thread(hooks['get_settings_file_path'])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error occurred during settings file path resolution: {e}',
        ) from None

    content = await asyncio.to_thread(
        lambda: yaml.dump(
            settings.model_dump(),
            sort_keys=False,
        ),
    )

    try:
        async with aiofiles.open(path, 'w') as f:
            await f.write(content)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Settings cannot be copied due to OS error: {e}',
        ) from None


@router.post('/stop', description='Stop instance')
async def stop(hooks: InstanceHooksDep) -> None:
    try:
        await asyncio.to_thread(hooks['terminate'])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error occurred during termination: {e}',
        ) from None


@router.post('/restart', description='Restart instance')
async def restart(hooks: InstanceHooksDep) -> None:
    try:
        await asyncio.to_thread(hooks['restart'])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error occurred during restart: {e}',
        ) from None
