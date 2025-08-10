"""API app dependencies."""

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine
from sqlmodel import Session

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


def get_db_engine(request: Request) -> Engine:
    """Get database engine.

    Parameters
    ----------
    request : Request
        Current request.

    Returns
    -------
    Engine
        Obtained database engine.

    """
    return request.app.state.db_engine


DBEngineDep = Annotated[
    Engine,
    Depends(get_settings),
]


def get_session(db_engine: DBEngineDep) -> Generator[Session]:
    """Get database session.

    Parameters
    ----------
    db_engine : DBEngineDep
        Database engine.

    Yields
    ------
    Session
        Database session.

    """
    with Session(db_engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
