"""Plugin exceptions."""

from eventum.exceptions import ContextualError


class PluginError(ContextualError):
    """Base plugin error."""


class PluginRegistrationError(PluginError):
    """Plugin registration failed."""


class PluginLoadError(PluginError):
    """Error during plugin loading."""


class PluginNotFoundError(PluginError):
    """Plugin is not found."""


class PluginConfigurationError(PluginError):
    """Configuration for plugin is invalid."""
