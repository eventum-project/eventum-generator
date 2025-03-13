"""Definition of timestamps input plugin config."""

from datetime import datetime
from pathlib import Path

from pydantic import Field, field_validator

from eventum.plugins.input.base.config import InputPluginConfig


class TimestampsInputPluginConfig(InputPluginConfig, frozen=True):
    """Configuration for `timestamps` input plugin.

    Attributes
    ----------
    source : list[datetime] | Path
        List of timestamps or absolute path to file with new line
        separated timestamps in ISO8601 format

    Notes
    -----
    It is expected that timestamps are already sorted in ascending
    order

    """

    source: list[datetime] | Path = Field(min_length=1)

    @field_validator('source')
    @classmethod
    def validate_source(  # noqa: D102
        cls,
        v: list[datetime] | Path,
    ) -> list[datetime] | Path:
        if isinstance(v, Path) and not v.is_absolute():
            msg = 'Path must be absolute'
            raise ValueError(msg)

        return v
