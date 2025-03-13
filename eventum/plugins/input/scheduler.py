"""Scheduler for publishing timestamps at moments in time that
correspond to the value of those timestamps.
"""

import asyncio
import time
from collections.abc import AsyncIterator, Iterator
from typing import TYPE_CHECKING, override

from pytz import BaseTzInfo

from eventum.plugins.input.batcher import TimestampsBatcher
from eventum.plugins.input.protocols import (
    IdentifiedTimestamps,
    SupportsAsyncIdentifiedTimestampsIterate,
    SupportsIdentifiedTimestampsIterate,
)
from eventum.plugins.input.utils.time_utils import (
    now64,
    timedelta64_to_seconds,
)

if TYPE_CHECKING:
    import numpy as np


class BaseBatchScheduler:
    """Scheduler of timestamp batches. Scheduler iterates over batches
    of timestamps and does not yield them immediately, but it waits
    until current time reaches the last timestamps in the batch.
    """

    def __init__(
        self,
        batcher: TimestampsBatcher,
        timezone: BaseTzInfo,
    ) -> None:
        """Initialize scheduler.

        Parameters
        ----------
        batcher : TimestampsBatcher
            Timestamps batcher

        timezone : BaseTzInfo, default=pytz.timezone('UTC')
            Timezone of timestamps in batches, used to track current time

        """
        self._batcher = batcher
        self._timezone = timezone

    def _iterate(
        self,
        *,
        skip_past: bool = True,
    ) -> Iterator[tuple[IdentifiedTimestamps, float]]:
        """Iterate over arrays of identified timestamps.

        Parameters
        ----------
        skip_past : bool, default=True
            Whether to skip past timestamps before starting iteration

        Yields
        ------
        tuple[IdentifiedTimestamps, float]
            Array of timestamps and number of seconds to wait before it
            should be published

        """
        for array in self._batcher.iterate(skip_past=skip_past):
            now = now64(self._timezone)
            latest_ts: np.datetime64 = array['timestamp'][-1]
            delta = latest_ts - now

            yield (array, max(timedelta64_to_seconds(timedelta=delta), 0))


class BatchScheduler(SupportsIdentifiedTimestampsIterate, BaseBatchScheduler):
    """Synchronous version of scheduler of timestamp batches.

    Notes
    -----
    See `BaseBatchScheduler` documentation.

    """

    @override
    def __init__(
        self,
        batcher: TimestampsBatcher,
        timezone: BaseTzInfo,
    ) -> None:
        self._batcher = batcher
        self._timezone = timezone

    @override
    def iterate(
        self,
        *,
        skip_past: bool = True,
    ) -> Iterator[IdentifiedTimestamps]:
        for array, delay in self._iterate(skip_past=skip_past):
            time.sleep(delay)
            yield array


class AsyncBatchScheduler(
    SupportsAsyncIdentifiedTimestampsIterate,
    BaseBatchScheduler,
):
    """Async version of scheduler of timestamp batches.

    Notes
    -----
    See `BaseBatchScheduler` documentation.

    """

    @override
    def __init__(
        self,
        batcher: TimestampsBatcher,
        timezone: BaseTzInfo,
    ) -> None:
        self._batcher = batcher
        self._timezone = timezone

    @override
    async def iterate(
        self,
        *,
        skip_past: bool = True,
    ) -> AsyncIterator[IdentifiedTimestamps]:
        for array, delay in self._iterate(skip_past=skip_past):
            await asyncio.sleep(delay)
            yield array
