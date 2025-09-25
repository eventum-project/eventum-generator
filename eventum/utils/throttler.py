"""Tools for throttling function and coroutine calls."""

import time
from collections import deque
from collections.abc import Callable, Coroutine


class BaseThrottler:
    """Base throttler."""

    type AbsoluteTime = float

    def __init__(self, limit: int, period: float) -> None:
        """Initialize throttler.

        Parameters
        ----------
        limit : int
            Limit of the calls per period

        period : float
            Period for the limit (in seconds).

        Raises
        ------
        ValueError
            If limit or period are less than 1.

        Notes
        -----
        Reduce the ratio of limit to period for minimizing memory usage
        (e.g. use limit=10, period=1.0 instead of limit=100, period=10.0).

        """
        if limit < 1:
            msg = 'Limit must be greater or equal to 1'
            raise ValueError(msg)

        if period < 1:
            msg = 'Period must be greater or equal to 1.0'
            raise ValueError(msg)

        self._limit = limit
        self._period = period
        self._moments: deque[BaseThrottler.AbsoluteTime] = deque(
            maxlen=limit,
        )

    def _check_throttling(self) -> bool:
        """Check throttling.

        Returns
        -------
        bool
            `True` if throttling is active `False` otherwise.

        """
        limit_reached = len(self._moments) == self._limit

        if limit_reached:
            now = time.monotonic()
            time_since_earliest = now - self._moments[0]

            return time_since_earliest < self._period

        return False

    def _count(self) -> None:
        """Count the usage."""
        now = time.monotonic()
        self._moments.append(now)


class Throttler(BaseThrottler):
    """Synchronous implementation of throttler."""

    def __call__[**P, T_Ret](
        self,
        func: Callable[P, T_Ret],
        /,
        *f_args: P.args,
        **f_kwargs: P.kwargs,
    ) -> T_Ret | None:
        """Call the function with provided args and kwargs and return
        its result if the throttling is not active.

        Parameters
        ----------
        func : Callable[[T_Args, T_Kwargs], T_Ret]
            Function to call.

        *f_args : P.args
            Function args.

        **f_kwargs : P.kwargs
            Function kwargs.

        Returns
        -------
        T_Ret
            Function result if throttling is not active.

        None
            If throttling is active.

        """
        if self._check_throttling():
            return None

        self._count()
        return func(*f_args, **f_kwargs)


class AsyncThrottler(BaseThrottler):
    """Asynchronous implementation of throttler."""

    async def __call__[**P, T_Ret](
        self,
        coro_func: Callable[P, Coroutine[None, None, T_Ret]],
        /,
        *f_args: P.args,
        **f_kwargs: P.kwargs,
    ) -> T_Ret | None:
        """Await the coroutine and return its result if the throttling
        is not active.

        Parameters
        ----------
        coro_func: Callable[P, Coroutine[None, None, T_Ret]]
            Coroutine function.

        *f_args : P.args
            Coroutine args.

        **f_kwargs : P.kwargs
            Coroutine kwargs.

        Returns
        -------
        T_Ret
            Coroutine result if throttling is not active.

        None
            If throttling is active.

        """
        if self._check_throttling():
            return None

        self._count()
        return await coro_func(*f_args, **f_kwargs)
