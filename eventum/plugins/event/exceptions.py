"""Event plugin exceptions."""

from eventum.plugins.exceptions import PluginError


class PluginExhaustedError(Exception):
    """No more events can be produced by event plugin."""


class PluginProduceError(PluginError):
    """Event cannot be produced."""
