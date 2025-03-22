"""Definition of script event plugin config."""

from pathlib import Path

from pydantic import field_validator

from eventum.plugins.event.base.config import EventPluginConfig


class ScriptEventPluginConfig(EventPluginConfig, frozen=True):
    """Configuration for `script` event plugin.

    Attributes
    ----------
    path : Path
        Absolute path to script.

    """

    path: Path

    @field_validator('path')
    @classmethod
    def validate_path(cls, v: Path) -> Path:  # noqa: D102
        if v.is_absolute():
            return v

        msg = 'Path must be absolute'
        raise ValueError(msg)
