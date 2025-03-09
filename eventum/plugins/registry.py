"""Common registry for plugins registration.

This module should be used only by plugin modules to register
themselves and `loader` module to load registered plugins.

User should use `loader` module to access existing plugins and avoid
direct usage of registry.
"""

from dataclasses import dataclass
from types import ModuleType
from typing import ClassVar


@dataclass(frozen=True)
class PluginInfo:
    """Plugin information for a registration.

    Attributes
    ----------
    name : str
        Plugin name

    cls : type
        Plugin class

    config_cls : type
        Class of config used to configure plugin

    package : ModuleType
        Parent package of plugin package with plugins of specific type

    """

    name: str
    cls: type
    config_cls: type
    package: ModuleType


class PluginsRegistry:
    """Common registry of plugins. All plugins should be
    registered using this class to be accessible via loader.
    """

    _registry: ClassVar[dict[str, dict[str, PluginInfo]]] = {}

    @classmethod
    def register_plugin(cls, plugin_info: PluginInfo) -> None:
        """Register plugin in registry.

        Parameters
        ----------
        plugin_info : PluginInfo
            Information about plugin

        """
        location = plugin_info.package.__name__

        if location not in cls._registry:
            cls._registry[location] = {}

        cls._registry[location][plugin_info.name] = plugin_info

    @classmethod
    def get_plugin_info(cls, package: ModuleType, name: str) -> PluginInfo:
        """Get information about plugin from registry.

        Parameters
        ----------
        package : ModuleType
            Parent package with plugins of specific type

        name : str
            Plugin name

        Returns
        -------
        PluginInfo
            Information about plugin

        Raises
        ------
        ValueError
            If specified plugin is not found in registry

        """
        try:
            return cls._registry[package.__name__][name]
        except KeyError:
            msg = 'Plugin is not registered'
            raise ValueError(msg) from None

    @classmethod
    def is_registered(cls, package: ModuleType, name: str) -> bool:
        """Check whether specified plugin is registered.

        Parameters
        ----------
        package : ModuleType
            Parent package with plugins of specific type

        name : str
            Plugin name

        Returns
        -------
        bool
            `True` if plugin is registered else `False`

        """
        pkg_name = package.__name__
        return pkg_name in cls._registry and name in cls._registry[pkg_name]

    @classmethod
    def clear(cls) -> None:
        """Clear registry by removing all registered plugins from it."""
        cls._registry.clear()
