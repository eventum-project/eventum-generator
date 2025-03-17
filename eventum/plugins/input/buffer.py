"""Auxiliary buffer for accumulating timestamps in plugins before
publishing them.
"""

from collections import deque
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Literal, assert_never, cast

from numpy import concatenate, datetime64, full
from numpy.typing import NDArray


@dataclass(slots=True)
class BufferItem:
    """Buffer item.

    Attributes
    ----------
    type : Literal['v', 'm', 'mv']
        Type of item:
        v - single timestamp value,
        m - value of timestamps that should be multiplied,
        mv - multi value array of timestamps

    value : datetime64 | NDArray[datetime64]
        Target value

    multiply : int:
        multiplication factor for type 'm'

    """

    type: Literal['v', 'm', 'mv']
    value: datetime64 | NDArray[datetime64]
    multiply: int = 1


class Buffer:
    """Buffer for timestamps."""

    def __init__(self) -> None:
        """Initialize buffer."""
        self._buffer: deque[BufferItem] = deque()
        self._buffer_size = 0

    def push(self, timestamp: datetime64) -> None:
        """Push timestamp to buffer.

        Parameters
        ----------
        timestamp : datetime64
            Timestamp to push

        """
        self._buffer.append(BufferItem(type='v', value=timestamp))
        self._buffer_size += 1

    def m_push(self, timestamp: datetime64, multiply: int) -> None:
        """Push multiple timestamps of the same value to buffer.

        Parameters
        ----------
        timestamp : datetime64
            Timestamp to push

        multiply : int
            How many values of provided `timestamp` to push

        Raises
        ------
        ValueError
            If parameter "multiply" is less than 1

        """
        if multiply < 1:
            msg = 'Parameter "multiply" must be greater or equal to 1'
            raise ValueError(msg)

        self._buffer.append(
            BufferItem(type='m', value=timestamp, multiply=multiply),
        )
        self._buffer_size += multiply

    def mv_push(self, timestamps: NDArray[datetime64]) -> None:
        """Push multi value timestamps array to buffer.

        Parameters
        ----------
        timestamps : NDArray[datetime64]
            Timestamps to push

        """
        if timestamps.size == 0:
            return

        self._buffer.append(BufferItem(type='mv', value=timestamps))
        self._buffer_size += timestamps.size

    def _read_v(self) -> NDArray[datetime64]:
        """Read single timestamp value from non empty buffer.

        Returns
        -------
        NDArray[datetime64]
            Array with timestamp

        """
        item = self._buffer.popleft()
        value = cast('datetime64', item.value)

        return full(
            shape=1,
            fill_value=value,
            dtype='datetime64[us]',
        )

    def _read_m(self, required: int) -> NDArray[datetime64]:
        """Read multiplied timestamp value from non empty buffer.

        Parameters
        ----------
        required : int
            Number of timestamps to read from value

        Returns
        -------
        NDArray[datetime64]
            Array with timestamp

        """
        item = self._buffer[0]
        value = cast('datetime64', item.value)

        if required >= item.multiply:
            self._buffer.popleft()
            n = item.multiply
        else:
            item.multiply -= required
            n = required

        return full(
            shape=n,
            fill_value=value,
            dtype='datetime64[us]',
        )

    def _read_mv(self, required: int) -> NDArray[datetime64]:
        """Read multivalue array of timestamps from non empty buffer.

        Parameters
        ----------
        required : int
            Number of timestamps to read from array

        Returns
        -------
        NDArray[datetime64]
            Array with timestamp

        """
        item = self._buffer[0]
        value = cast('NDArray[datetime64]', item.value)

        if required >= value.size:
            self._buffer.popleft()
            return value

        item.value = value[required:]

        return value[:required]

    def read(
        self,
        size: int,
        *,
        partial: bool = False,
    ) -> Iterator[NDArray[datetime64]]:
        """Read timestamps from buffer by arrays of specified size.

        Parameters
        ----------
        size : int
            Size of arrays

        partial : bool, default = False
            Read until buffer is empty event if the last array is not
            complete

        Yields
        ------
        NDArray[datetime64]
            Array of timestamps

        Raises
        ------
        ValueError
            If  parameter "size" is less than 1

        Notes
        -----
        No push methods are supposed to be called until this method
        generator is exhausted

        """
        if size < 1:
            msg = 'Parameter "size" must be greater or equal to 1'
            raise ValueError(msg)

        to_concatenate: list[NDArray[datetime64]] = []
        current_size = 0

        while True:
            if len(self._buffer) == 0:
                break

            item = self._buffer[0]

            match item.type:
                case 'v':
                    arr = self._read_v()
                case 'm':
                    arr = self._read_m(required=(size - current_size))
                case 'mv':
                    arr = self._read_mv(required=(size - current_size))
                case t:
                    assert_never(t)

            current_size += arr.size
            to_concatenate.append(arr)

            if current_size >= size:
                yield concatenate(to_concatenate)

                self._buffer_size -= size
                current_size = 0
                to_concatenate.clear()

        if to_concatenate:
            remaining_array = concatenate(to_concatenate)
            to_concatenate.clear()

            if partial:
                yield remaining_array
                self._buffer_size -= remaining_array.size
            else:
                self._buffer.appendleft(
                    BufferItem(
                        type='mv',
                        value=remaining_array,
                    ),
                )

    @property
    def size(self) -> int:
        """Current number of timestamps in buffer."""
        return self._buffer_size
