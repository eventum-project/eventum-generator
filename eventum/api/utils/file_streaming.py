"""File streaming utils."""

import asyncio
import os
from collections.abc import AsyncIterator
from pathlib import Path

import aiofiles


async def stream_file(path: Path, end_offset: int) -> AsyncIterator[str]:
    """Stream file from the end.

    Parameters
    ----------
    path : Path
        Path to file to stream.

    end_offset : int
        Offset from the end of file to start streaming from.

    Yields
    ------
    str
        File chunk.

    Raises
    ------
    OSError
        If file cannot be read.

    """
    async with aiofiles.open(path) as f:
        await f.seek(0, os.SEEK_END)
        size = await f.tell()
        start_pos = max(0, size - end_offset)
        await f.seek(start_pos, os.SEEK_SET)

        while True:
            content = await f.read(8192)
            if content:
                yield content
            else:
                await asyncio.sleep(0.5)
