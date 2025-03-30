"""Custom structlog processors."""

import logging
from collections.abc import Callable, Iterable
from typing import Any

from structlog.typing import EventDict


def derive_extras(
    extras: Iterable[str],
) -> Callable[
    [
        Callable[
            [logging.Logger, str, EventDict],
            tuple[tuple[EventDict], dict[str, dict[str, Any]]],
        ],
    ],
    Callable[
        [logging.Logger, str, EventDict],
        tuple[tuple[EventDict], dict[str, dict[str, Any]]],
    ],
]:
    """Return decorator that adds specified extras to kwargs of last
    processor.

    Parameters
    ----------
    extras : Iterable[str]
        List of keys to get from event dict and add them to the
        `"extra"` key in kwargs returned by last processor.

    Returns
    -------
    Callable[...]
        Decorator.

    """

    def wrapper(
        f: Callable[
            [logging.Logger, str, EventDict],
            tuple[tuple[EventDict], dict[str, dict[str, Any]]],
        ],
    ) -> Callable[
        [logging.Logger, str, EventDict],
        tuple[tuple[EventDict], dict[str, dict[str, Any]]],
    ]:
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            log_args, log_kwargs = f(*args, **kwargs)
            event_dict = log_args[0]

            if 'extra' not in log_kwargs:
                log_kwargs['extra'] = {}

            for key in extras:
                if key in event_dict:
                    log_kwargs['extra'][key] = event_dict[key]

            return log_args, log_kwargs

        return wrapped

    return wrapper


def remove_keys_processor(
    keys: Iterable[str],
) -> Callable[[logging.Logger, str, EventDict], EventDict]:
    """Return a processor function that removes specific keys from
    the event dict.

    Parameters
    ----------
    keys : Iterable[str]
        List of keys to remove from event dict.

    Returns
    -------
    Callable
        A structlog processor function that modifies the event dictionary.

    """

    def processor(
        _: logging.Logger,
        __: str,
        event_dict: EventDict,
    ) -> EventDict:
        for key in keys:
            event_dict.pop(key, None)

        return event_dict

    return processor
