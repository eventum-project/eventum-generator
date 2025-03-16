"""Definition of base plugin metrics."""

from typing import TypedDict


class PluginMetrics(TypedDict):
    """Plugin metrics.

    Attributes
    ----------
    name : str
        Name of the plugin

    id : int
        ID of the plugin

    type : str
        Type of the plugin

    """

    id: int
    name: str
    type: str
