"""Hooks for managing instance using API."""

from collections.abc import Callable
from pathlib import Path
from typing import TypedDict


class InstanceHooks(TypedDict):
    """Hooks for managing instance."""

    get_settings_file_path: Callable[[], Path]
    terminate: Callable[[], None]
    restart: Callable[[], None]
