"""Path parameters."""

from pathlib import Path

from pydantic import BaseModel, field_validator


class PathParameters(BaseModel, extra='forbid', frozen=True):
    """Path parameters.

    Attributes
    ----------
    logs : Path
        Absolute path to logs directory.

    startup : Path
        Absolute path to file with list of generators to run at startup.

    generators_dir : Path
        Absolute path to directory with generators configuration files.

    keyring_cryptfile : Path
        Absolute path to keyring encrypted file with stored secrets

    """

    logs: Path
    startup: Path
    generators_dir: Path
    keyring_cryptfile: Path

    @field_validator(
        'logs',
        'startup',
        'generators_dir',
        'keyring_cryptfile',
    )
    @classmethod
    def validate_paths(cls, v: Path) -> Path:  # noqa: D102
        if v.is_absolute():
            return v

        msg = 'Path must be absolute'
        raise ValueError(msg)
