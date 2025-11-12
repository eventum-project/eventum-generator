"""Definition of script event plugin config."""

from pathlib import Path

from eventum.plugins.event.base.config import EventPluginConfig


class ScriptEventPluginConfig(EventPluginConfig, frozen=True):
    """Configuration for `script` event plugin.

    Attributes
    ----------
    path : Path
        Path to script.

    """

    path: Path
