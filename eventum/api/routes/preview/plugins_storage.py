"""Persisting runtime state of used event plugins."""

from pathlib import Path

from eventum.plugins.event.base.plugin import EventPlugin


class _EventPluginsStorage:
    """Class for holding instances of event plugins for persisting
    their state across api calls.

    This class should be used as a singleton.
    """

    def __init__(self) -> None:
        """Initialize empty event plugins storage."""
        self._state: dict[Path, EventPlugin] = {}

    def get(self, path: Path) -> EventPlugin:
        """Get event plugin instance from the storage for specified
        path.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        Returns
        -------
        EventPlugin
            Event plugin instance.

        Raises
        ------
        KeyError
            If the plugin instance is not in the storage.

        """
        return self._state[path]

    def set(self, path: Path, plugin: EventPlugin) -> None:
        """Set event plugin instance to the storage for the specified
        path.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        plugin : EventPlugin
            Event plugin instance to set to the storage.

        Notes
        -----
        If plugin is already set in the storage, then it will be just
        overwritten.

        """
        self._state[path] = plugin

    def remove(self, path: Path) -> None:
        """Remove event plugin instance from the storage for the
        specified path.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        Raises
        ------
        KeyError
           If the plugin instance is not set in the storage.

        """
        del self._state[path]

    def is_set(self, path: Path) -> bool:
        """Check whether an event plugin instance is set to the
        storage for the specified path.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        Returns
        -------
        bool
            `True` if the plugin instance is in the storage, `False`
            otherwise.

        """
        return path in self._state


EVENT_PLUGINS = _EventPluginsStorage()
