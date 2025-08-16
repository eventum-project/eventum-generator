"""API app dependencies."""

from typing import Annotated

from fastapi import Depends, Request

from eventum.app.manager import GeneratorManager
from eventum.app.models.settings import Settings


def get_generator_manager(request: Request) -> GeneratorManager:
    """Get generator manager.

    Parameters
    ----------
    request : Request
        Current request.

    Returns
    -------
    GeneratorManager
        Obtained generator manager.

    """
    return request.app.state.generator_manager


GeneratorManagerDep = Annotated[
    GeneratorManager,
    Depends(get_generator_manager),
]


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
