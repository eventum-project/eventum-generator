"""Adapters for protocols defined in `protocols` module."""

from collections.abc import AsyncIterator, Iterator
from concurrent.futures import Future, ThreadPoolExecutor
from typing import override

import janus
import numpy as np

from eventum.plugins.input.base.plugin import InputPlugin
from eventum.plugins.input.protocols import (
    IdentifiedTimestamps,
    SupportsAsyncIdentifiedTimestampsIterate,
    SupportsIdentifiedTimestampsIterate,
    SupportsIdentifiedTimestampsSizedIterate,
)


class IdentifiedTimestampsPluginAdapter(
    SupportsIdentifiedTimestampsSizedIterate,
):
    """Adapter for input plugin to follow
    `SupportsIdentifiedTimestampsSizedIterate` protocol.
    """

    def __init__(self, plugin: InputPlugin) -> None:
        """Initialize adapter.

        Parameters
        ----------
        plugin : InputPlugin
            Input plugin to adapt.

        """
        self._plugin = plugin

    @override
    def iterate(
        self,
        size: int,
        *,
        skip_past: bool = True,
    ) -> Iterator[IdentifiedTimestamps]:
        if size < 1:
            msg = 'Parameter `size` must be greater or equal to 1'
            raise ValueError(msg)

        for array in self._plugin.generate(size=size, skip_past=skip_past):
            array_with_id: IdentifiedTimestamps = np.empty(
                shape=array.size,
                dtype=[('timestamp', 'datetime64[us]'), ('id', 'uint16')],
            )
            array_with_id['timestamp'][:] = array
            array_with_id['id'][:] = self._plugin.id

            yield array_with_id


class AsyncIdentifiedTimestampsSyncAdapter(
    SupportsAsyncIdentifiedTimestampsIterate,
):
    """Adapter for object that follows
    `SupportsIdentifiedTimestampsIterate` protocol to follow
    `SupportsAsyncIdentifiedTimestampsIterate` protocol.

    Notes
    -----
    Target is iterated in a separate thread to avoid possible blocking
    of event loop.

    """

    def __init__(self, target: SupportsIdentifiedTimestampsIterate) -> None:
        """Initialize adapter.

        Parameters
        ----------
        target : SupportsIdentifiedTimestampsIterate
            Target to adapt.

        """
        self._target = target
        self._queue: janus.Queue[IdentifiedTimestamps | None] = janus.Queue(
            maxsize=1,
        )

    def _start_iteration(self, *, skip_past: bool = True) -> None:
        """Start iteration over target with producing to queue."""
        for array in self._target.iterate(skip_past=skip_past):
            self._queue.sync_q.put(array)

    def _finalize_iteration(self, future: Future[None]) -> None:
        """Finalize iteration over target by putting sentinel to queue."""
        try:
            future.result()  # propagate possible exceptions
        finally:
            self._queue.sync_q.put(None)

    @override
    async def iterate(
        self,
        *,
        skip_past: bool = True,
    ) -> AsyncIterator[IdentifiedTimestamps]:
        with ThreadPoolExecutor(
            max_workers=1,
            thread_name_prefix='async-identified-timestamps-sync-adapter',
        ) as executor:
            future = executor.submit(
                lambda: self._start_iteration(skip_past=skip_past),
            )
            future.add_done_callback(self._finalize_iteration)

            while True:
                array = await self._queue.async_q.get()

                if array is None:
                    break

                yield array


class AsyncIdentifiedTimestampsEmptyAdapter(
    SupportsAsyncIdentifiedTimestampsIterate,
):
    """Adapter that follows `SupportsAsyncIdentifiedTimestampsIterate`
    but it's empty.
    """

    @override
    async def iterate(
        self,
        *,
        skip_past: bool = True,
    ) -> AsyncIterator[IdentifiedTimestamps]:
        return
        yield
