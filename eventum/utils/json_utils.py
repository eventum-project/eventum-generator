"""JSON-related utils."""

from typing import Any


def normalize_types(obj: Any) -> Any:
    """Recursively convert a dict/list structure so that only
    int, float, bool, None, and nested dicts/lists remain.
    Any other value is replaced with repr(obj).

    Parameters
    ----------
    obj : Any
        Object to normalize.

    Returns
    -------
    Any
        Normalized object

    """
    if isinstance(obj, dict):
        return {k: normalize_types(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize_types(v) for v in obj]
    if isinstance(obj, str | int | float | bool) or obj is None:
        return obj

    return repr(obj)
