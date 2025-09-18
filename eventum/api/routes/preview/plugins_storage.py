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
        self._state: dict[Path, dict[str, EventPlugin]] = {}

    def get(self, path: Path, name: str) -> EventPlugin:
        """Get event plugin instance from the storage by path and name.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        name : str
            Name of the event plugin.

        Returns
        -------
        EventPlugin
            Event plugin instance.

        Raises
        ------
        KeyError
            If the plugin instance is not in the storage.

        """
        return self._state[path][name]

    def add(self, path: Path, name: str, plugin: EventPlugin) -> None:
        """Add event plugin instance to the storage.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        name : str
            Name of the event plugin.

        plugin : EventPlugin
            Event plugin instance to add to the storage.

        """
        if path not in self._state:
            self._state[path] = {}

        self._state[path][name] = plugin

    def remove(self, path: Path, name: str) -> None:
        """Remove event plugin instance from the storage.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        name : str
            Name of the event plugin.

        Raises
        ------
        KeyError
           If the plugin instance is not in the storage.

        """
        del self._state[path][name]

    def contains(self, path: Path, name: str) -> bool:
        """Check whether an event plugin instance is added to the
        storage.

        Parameters
        ----------
        path : Path
            Event plugin working directory (generator directory).

        name : str
            Name of the event plugin.

        Returns
        -------
        bool
            `True` if the plugin instance is in the storage, `False`
            otherwise.

        """
        return path in self._state and name in self._state[path]


EVENT_PLUGINS = _EventPluginsStorage()
