"""Utils for working with numpy arrays."""

from collections.abc import Sequence

from numpy import concatenate, datetime64, searchsorted, sort
from numpy.typing import NDArray


def get_future_slice(
    timestamps: NDArray[datetime64],
    after: datetime64,
) -> NDArray[datetime64]:
    """Get slice of timestamps `after` the moment using binary search.

    Parameters
    ----------
    timestamps : NDArray[datetime64]
        Timestamps array sorted in ascending order.

    after : datetime64
        Cutoff moment.

    Returns
    -------
    NDArray[datetime64]
        Slice of original timestamps array after the specified moment.

    """
    index = searchsorted(a=timestamps, v=after, side='right')
    return timestamps[index:]


def get_past_slice(
    timestamps: NDArray[datetime64],
    before: datetime64,
) -> NDArray[datetime64]:
    """Get slice of timestamps `before` the moment using binary search.

    Parameters
    ----------
    timestamps : NDArray[datetime64]
        Timestamps array sorted in ascending order.

    before : datetime64
        Cutoff moment.

    Returns
    -------
    NDArray[datetime64]
        Slice of original timestamps array before the specified moment.

    """
    index = searchsorted(a=timestamps, v=before, side='right')
    return timestamps[:index]


def chunk_array(array: NDArray, size: int) -> list[NDArray]:
    """Split array into chunks with size `chunk_size`. Last chunk size
    can be smaller than `chunk_size`. Chunks are slices of original
    array.

    Parameters
    ----------
    array : NDArray
        Array to chunk.

    size : int
        Size of one chunk.

    Returns
    -------
    list[NDArray]
        List of chunks.

    """
    return [array[i : i + size] for i in range(0, array.size, size)]


def merge_arrays(arrays: Sequence[NDArray]) -> NDArray:
    """Merge sorted arrays.

    Parameters
    ----------
    arrays : Sequence[NDArray]
        Arrays to merge.

    Returns
    -------
    NDArray
        Merged sorted resulting array.

    Raises
    ------
    ValueError
        If arrays sequence is empty.

    Notes
    -----
    If array is structured or multidimensional then zeroth axis is used.

    """
    if not arrays:
        msg = 'At least one array must be provided'
        raise ValueError(msg)

    return sort(
        a=concatenate(arrays),
        kind='mergesort',
        axis=0,
    )
