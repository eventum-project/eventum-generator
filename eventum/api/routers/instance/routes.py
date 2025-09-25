"""Routes."""

from fastapi import APIRouter, HTTPException, status

from eventum.api.dependencies.app import InstanceHooksDep, SettingsDep
from eventum.api.routers.instance.models import InstanceInfo
from eventum.app.models.settings import Settings

router = APIRouter()


@router.get('/info', description='Information about app and host')
async def get_info() -> InstanceInfo:
    return InstanceInfo()


@router.get('/settings', description='Settings')
async def get_settings(settings: SettingsDep) -> Settings:
    return settings


@router.post('/stop', description='Stop instance')
async def stop(hooks: InstanceHooksDep) -> None:
    try:
        hooks['terminate']()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error occurred during termination: {e}',
        ) from None
