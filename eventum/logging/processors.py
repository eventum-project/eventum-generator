"""Custom structlog processors."""

import logging
from collections.abc import Callable, Iterable
from typing import Any

from structlog.typing import EventDict, Processor


def derive_extras(
    extras: Iterable[str],
) -> Callable[[Processor], Processor]:
    """Return decorator that adds specified extras to kwargs of last
    processor.

    Parameters
    ----------
    extras : Iterable[str]
        List of keys to get from event dict and add them to the
        `"extra"` key in kwargs returned by last processor.

    Returns
    -------
    Callable[[Processor], Processor]
        Decorator.

    Raises
    ------
    TypeError
        If not `structlog.stdlib.ProcessorFormatter.wrap_for_formatter`
        is used as last processor.

    Notes
    -----
    Only `structlog.stdlib.ProcessorFormatter.wrap_for_formatter` is
    supported as the last processor.

    """

    def wrapper(f: Processor) -> Processor:
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            result = f(*args, **kwargs)

            if not isinstance(result, tuple):
                msg = (
                    'Please use '
                    '`structlog.stdlib.ProcessorFormatter.wrap_for_formatter` '
                    'as the last processor'
                )
                raise TypeError(msg)

            log_args, log_kwargs = result
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
