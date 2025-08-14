"""Path parameters."""

from pathlib import Path

from pydantic import BaseModel, field_validator


class PathParameters(BaseModel, extra='forbid', frozen=True):
    """Path parameters.

    Attributes
    ----------
    logs : Path
        Absolute path to logs directory.

    generators : Path
        Absolute path to file with generators definition.

    generators_dir : Path
        Absolute path to directory with generators configuration files.

    db : Path
        Absolute path to database.

    """

    logs: Path
    generators: Path
    generators_dir: Path
    db: Path

    @field_validator('logs', 'generators', 'generators_dir', 'db')
    @classmethod
    def validate_paths(cls, v: Path) -> Path:  # noqa: D102
        if v.is_absolute():
            return v

        msg = 'Path must be absolute'
        raise ValueError(msg)
