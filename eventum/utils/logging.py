import functools
import logging
from typing import Any, Callable

import structlog
from lru import LRU


def run_with_thread_context(
    ctx: dict[str, Any] | None = None
) -> Callable[[Callable], Callable]:
    """Parameterized decorator for binding provided context to a
    function that will be executed in separate thread.

    Parameters
    ----------
    ctx : dict[str, Any] | None
        Context to bind, current context is used if none is provided

    Returns
    -------
    Callable
        Decorator
    """
    ctx = ctx or structlog.contextvars.get_contextvars()

    def wrapper(f: Callable) -> Callable:
        @functools.wraps(f)
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            structlog.contextvars.bind_contextvars(**ctx)
            return f(*args, **kwargs)

        return wrapped

    return wrapper


class RoutingHandler(logging.Handler):
    """Handler that routes logs to different handlers based on value of
    specific log record attribute.

    Parameters
    ----------
    attr : str
        Name of log record attribute to use for routing

    handler_factory : Callable[[str | None], logging.Handler]
        Factory for creating new handlers (each for unique value of
        specified log record attribute), attribute value is passed to
        factory function as single argument

    formatter: logging.Formatter
        Formatter that will be used for created handlers
    """

    def __init__(
        self,
        attr: str,
        handler_factory: Callable[[str | None], logging.Handler],
        formatter: logging.Formatter
    ) -> None:
        super().__init__()
        self._attr = attr
        self._handler_factory = handler_factory
        self._handlers: LRU[str | None, logging.Handler] = LRU(size=1024)
        self._formatter = formatter

    def emit(self, record: logging.LogRecord) -> None:
        attr_value = getattr(record, self._attr, None)

        if attr_value not in self._handlers:
            handler = self._handler_factory(attr_value)
            handler.setFormatter(self._formatter)
            self._handlers[attr_value] = handler

        self._handlers[attr_value].emit(record)
