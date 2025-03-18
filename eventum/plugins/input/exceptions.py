"""Input plugin exceptions."""

from eventum.plugins.exceptions import PluginError


class PluginGenerationError(PluginError):
    """Timestamps cannot be generated."""
