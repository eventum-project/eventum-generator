"""Dependencies used across routers."""

from typing import Annotated

from fastapi import Depends, Request

from eventum.app.models.settings import Settings


def get_settings(request: Request) -> Settings:
    """Get application settings.

    Parameters
    ----------
    request : Request
        Current request.

    Returns
    -------
    Settings
        Obtained application settings.

    """
    return request.app.state.settings


SettingsDep = Annotated[
    Settings,
    Depends(get_settings),
]
