"""Definition of timestamps input plugin config."""

from datetime import datetime
from pathlib import Path

from eventum.plugins.input.base.config import InputPluginConfig


class TimestampsInputPluginConfig(InputPluginConfig, frozen=True):
    """Configuration for `timestamps` input plugin.

    Attributes
    ----------
    source : list[datetime] | Path
        List of timestamps or path to file with new line separated
        timestamps in ISO8601 format.

    Notes
    -----
    It is expected that timestamps are already sorted in ascending
    order.

    """

    source: list[datetime] | Path
