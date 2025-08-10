"""Database configuration."""

from sqlalchemy import URL, Engine
from sqlmodel import SQLModel, create_engine

from eventum.api.dependencies import SettingsDep


def get_engine(settings: SettingsDep) -> Engine:
    """Get database engine.

    Parameters
    ----------
    settings : SettingsDep
        Application settings dependency.

    Returns
    -------
    Engine
        Database engine.

    Raises
    ------
    SQLAlchemyError
        If some error occurs during creating engine.

    """
    db_url = URL.create(
        drivername='sqlite',
        database=settings.path.db.as_posix(),
    )
    return create_engine(url=db_url, echo=True)


def init(engine: Engine) -> None:
    """Initialize database with provided engine.

    Parameters
    ----------
    engine : Engine
        Engine for database control.

    Raises
    ------
    SQLAlchemyError
        If some error occurs during database initialization.

    """
    SQLModel.metadata.create_all(engine, checkfirst=True)
