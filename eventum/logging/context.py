"""Functions for working with logger context."""

import functools
from collections.abc import Callable
from typing import Any

import structlog


def propagate_logger_context(
    context: dict[str, Any] | None = None,
) -> Callable[[Callable], Callable]:
    """Parameterized decorator for propagating provided context to
    logger that is used in wrapped function that is going to be
    executed in other thread.

    Parameters
    ----------
    context : dict[str, Any] | None, default=None
        Context to bind, current logging context is used if none is
        provided.

    Returns
    -------
    Callable
        Decorator.

    """
    context = context or structlog.contextvars.get_contextvars()

    def wrapper(f: Callable) -> Callable:
        @functools.wraps(f)
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            structlog.contextvars.bind_contextvars(**context)
            return f(*args, **kwargs)

        return wrapped

    return wrapper
