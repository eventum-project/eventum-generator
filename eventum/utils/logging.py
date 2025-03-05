import functools
from typing import Any, Callable

import structlog


def with_thread_context(
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
