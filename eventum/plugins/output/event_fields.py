"""Reference from a plugin config to a field of the event."""

from typing import Any

from pydantic import BaseModel, Field


class EventFieldRef(BaseModel, frozen=True, extra='forbid'):
    """Reference to a field of the event.

    Parameters
    ----------
    field : str
        Path to the field, with nesting levels separated by dots. Each
        level is looked up as a whole key first, so both nested objects
        and keys spelled with dots are reached by the same path.

    """

    field: str = Field(min_length=1)


def lookup_field(data: Any, path: str) -> Any:
    """Look up a field of the event by its path.

    Parameters
    ----------
    data : Any
        Decoded event or a part of it.

    path : str
        Path to the field, with nesting levels separated by dots.

    Returns
    -------
    Any
        Value of the field, or `None` if the event does not carry it.

    Notes
    -----
    Each level is looked up as a whole key first, so a field is
    reached by the same path whether the event nests it
    (`{"host": {"name": ...}}`) or spells the key with dots
    (`{"host.name": ...}`).

    """
    if not isinstance(data, dict):
        return None

    if path in data:
        return data[path]

    head, separator, tail = path.partition('.')

    while separator:
        if head in data:
            value = lookup_field(data[head], tail)

            if value is not None:
                return value

        segment, separator, tail = tail.partition('.')
        head = f'{head}.{segment}'

    return None
