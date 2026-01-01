"""Definition of replay event plugin config."""

from pathlib import Path

from pydantic import Field

from eventum.plugins.event.base.config import EventPluginConfig
from eventum.plugins.fields import Encoding


class ReplayEventPluginConfig(EventPluginConfig, frozen=True):
    """Configuration for `replay` event plugin.

    Attributes
    ----------
    path : Path
        Path to log file.

    timestamp_pattern : str | None, default=None
        Regular expression pattern to identify the timestamp
        substitution position within the original message. The
        substitution is performed over the named group `timestamp`.
        If value is not set or pattern does not match, then
        substitution is not performed. For more information about
        python regex syntax see:
        https://docs.python.org/3/library/re.html#regular-expression-syntax

    timestamp_format : str | None, default=None
        Format string that defines how the actual timestamp should be
        substituted in the log message. The format follows C89 standard.
        For more information see:
        https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes
        If value is not set, then default (ISO 8601) format is used.

    repeat : bool, default=False
        Whether to repeat replaying after the end of file is reached.

    chunk_size : int, default = 1_048_576
        Number of bytes to read from the file at a time. This parameter
        controls how often to access file and how many data will be
        stored in in memory. If 0 is provided then the entire file is
        read at once.

    encoding : Encoding, default='utf_8'
        Encoding of the log file.

    """

    path: Path
    timestamp_pattern: str | None = None
    timestamp_format: str | None = None
    repeat: bool = False
    chunk_size: int = Field(default=1_048_576, ge=0)
    encoding: Encoding = Field(default='utf_8')
