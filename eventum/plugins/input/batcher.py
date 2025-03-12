"""Size and delay based batching of timestamp arrays."""

from collections.abc import Iterator
from datetime import timedelta
from typing import cast, override

import numpy as np
from numpy.typing import NDArray

from eventum.plugins.input.protocols import (
    IdentifiedTimestamps,
    SupportsIdentifiedTimestampsIterate,
    SupportsIdentifiedTimestampsSizedIterate,
)
from eventum.plugins.input.utils.array_utils import chunk_array


class TimestampsBatcher(SupportsIdentifiedTimestampsIterate):
    """Batcher of timestamps.

    Attributes
    ----------
    MIN_BATCH_SIZE : int
        Minimum batch size that can be configured for batcher

    MIN_BATCH_DELAY : float
        Minimum batch delay that can be configured for batcher

    """

    MIN_BATCH_SIZE = 1
    MIN_BATCH_DELAY = 0.1

    def __init__(
        self,
        source: SupportsIdentifiedTimestampsSizedIterate,
        batch_size: int | None = 100_000,
        batch_delay: float | None = None,
    ) -> None:
        """Initialize batcher.

        Parameters
        ----------
        source : SupportsIdentifiedTimestampsSizedIterate
            Source of identified timestamp arrays

        batch_size : int | None, default=100_000
            Maximum size of producing batches, not limited if value is
            `None`, cannot be  less than `MIN_BATCH_SIZE` attribute

        batch_delay: float | None, default=None
            Maximum time (in seconds) for single batch to accumulate
            incoming timestamps, not limited if value is `None`, cannot be
            less then `MIN_BATCH_DELAY` attribute

        Raises
        ------
        ValueError
            If some parameter is out of allowed range

        """
        if batch_size is None and batch_delay is None:
            msg = 'Batch size and delay cannot be both omitted'
            raise ValueError(msg)

        if batch_size is not None and not batch_size >= self.MIN_BATCH_SIZE:
            msg = (
                f'Batch size must be greater or equal to {self.MIN_BATCH_SIZE}'
            )
            raise ValueError(msg)

        if batch_delay is not None and batch_delay < self.MIN_BATCH_DELAY:
            msg = (
                'Batch delay must be greater or equal to '
                f'{self.MIN_BATCH_DELAY}'
            )
            raise ValueError(msg)

        self._batch_size = batch_size
        self._batch_delay = batch_delay

        self._source = source

    def _iterate_without_delay(
        self,
        iterator: Iterator[IdentifiedTimestamps],
    ) -> Iterator[IdentifiedTimestamps]:
        """Iterate over batches without a set delay parameter.

        Parameters
        ----------
        iterator: Iterator[IdentifiedTimestamps]
            Iterator to use

        """
        self._batch_size = cast(int, self._batch_size)
        current_size = 0
        to_concatenate: list[IdentifiedTimestamps] = []

        for array in iterator:
            to_concatenate.append(array)
            current_size += array.size

            if current_size >= self._batch_size:
                chunks = chunk_array(
                    array=np.concatenate(to_concatenate),
                    size=self._batch_size,
                )
                to_concatenate.clear()
                current_size = 0

                if chunks[-1].size < self._batch_size:
                    last_partial_chunk = chunks.pop()
                    to_concatenate.append(last_partial_chunk)
                    current_size += last_partial_chunk.size

                yield from chunks

        if to_concatenate:
            yield np.concatenate(to_concatenate)

    def _get_cutoff_index_by_delay(
        self,
        latest: np.datetime64,
        array: NDArray[np.datetime64],
    ) -> int:
        """Get cutoff index by delay condition.

        Parameters
        ----------
        latest : np.datetime64
            Latest timestamp for the batch

        array : NDArray[np.datetime64]
            Array to find index for

        Returns
        -------
        int
            Cutoff index

        """
        if latest < array[-1]:
            return int(
                np.searchsorted(
                    a=array,
                    v=latest,  # type: ignore[assignment]
                    side='right',
                ),
            )

        return array.size

    def _get_cutoff_index_by_size(
        self,
        current_size: int,
        array: NDArray,
    ) -> int:
        """Get cutoff index by size condition.

        Parameters
        ----------
        current_size : int
            Current size of batch

        array : NDArray
            Array to find index for

        Returns
        -------
        int
            Cutoff index

        """
        if self._batch_size is None:
            return array.size

        if (current_size + array.size) >= self._batch_size:
            return self._batch_size - current_size

        return array.size

    def _iterate_with_delay(
        self,
        iterator: Iterator[IdentifiedTimestamps],
    ) -> Iterator[IdentifiedTimestamps]:
        """Iterate over batches with a set delay parameter.

        Parameters
        ----------
        iterator: Iterator[IdentifiedTimestamps]
            Iterator to use

        """
        self._batch_delay = cast(float, self._batch_delay)

        delta = np.timedelta64(  # type: ignore[call-overload]
            timedelta(seconds=self._batch_delay),
            'us',
        )
        to_concatenate = []
        prev_array: IdentifiedTimestamps | None = None

        current_size = 0
        latest_timestamp: np.datetime64 | None = None

        while True:
            if prev_array is None:
                try:
                    array = next(iterator)
                except StopIteration:
                    break
            else:
                array = prev_array
                prev_array = None

            if latest_timestamp is None:
                latest_timestamp = array['timestamp'][0] + delta

            delay_cutoff_index = self._get_cutoff_index_by_delay(
                latest=latest_timestamp,  # type: ignore[arg-type]
                array=array['timestamp'],
            )
            size_cutoff_index = self._get_cutoff_index_by_size(
                current_size=current_size,
                array=array,
            )
            cutoff_index = min(delay_cutoff_index, size_cutoff_index)

            # process cutoff index
            if cutoff_index >= array.size:
                to_concatenate.append(array)
                current_size += array.size
            else:
                left_part = array[:cutoff_index]
                right_part = array[cutoff_index:]

                if left_part.size > 0:
                    to_concatenate.append(left_part)

                if right_part.size > 0:
                    prev_array = right_part

                yield np.concatenate(to_concatenate)

                to_concatenate.clear()
                current_size = 0
                latest_timestamp = None

        if to_concatenate:
            yield np.concatenate(to_concatenate)

    @override
    def iterate(
        self,
        skip_past: bool = True,
    ) -> Iterator[IdentifiedTimestamps]:
        iterator = self._source.iterate(
            size=self._batch_size or 10_000,
            skip_past=skip_past,
        )

        if self._batch_delay is None:
            yield from self._iterate_without_delay(iterator=iterator)
        else:
            yield from self._iterate_with_delay(iterator=iterator)
