"""Definition of file output plugin config."""

import os
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator

from eventum.plugins.fields import Encoding
from eventum.plugins.output.base.config import OutputPluginConfig


class FileOutputPluginConfig(OutputPluginConfig, frozen=True):
    """Configuration for `file` output plugin.

    Attributes
    ----------
    path : Path
        Absolute path of the file to write.

    flush_interval : float, default = 1
        Flush interval (in seconds) for flushing events, if value is 0
        then flush is performed for every event.

    cleanup_interval : float, default = 10
        Interval (in seconds) to wait new events before closing file,
        file is reopened once new events are received.

    file_mode : int, default = 640
        File access mode to use (e.g. 640).

    write_mode : Literal['append', 'overwrite'], default = 'append'
        Mode that is used to write if the file already exists.

    encoding : Encoding, default='utf-8'
        Encoding.

    separator : str, default=os.linesep
        Separator between events.

    """

    path: Path
    flush_interval: float = Field(default=1, ge=0)
    cleanup_interval: float = Field(default=10, ge=1.0)
    file_mode: int = Field(default=640, ge=0, le=7777)
    write_mode: Literal['append', 'overwrite'] = 'append'
    encoding: Encoding = Field(default='utf_8')
    separator: str = Field(default=os.linesep)

    @field_validator('path')
    @classmethod
    def validate_path(cls, v: Path) -> Path:  # noqa: D102
        if v.is_absolute():
            return v

        msg = 'Path must be absolute'
        raise ValueError(msg)
