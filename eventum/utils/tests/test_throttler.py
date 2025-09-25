import pytest

from eventum.utils.throttler import AsyncThrottler, Throttler


def test_throttler():
    throttler = Throttler(limit=10, period=1)
    values = []

    def increment():
        values.append(1)

    for i in range(1000):
        throttler(increment)

    assert len(values) == 10


@pytest.mark.asyncio
async def test_async_throttler():
    throttler = AsyncThrottler(limit=10, period=1)
    values = []

    async def increment():
        values.append(1)

    for i in range(1000):
        await throttler(increment)

    assert len(values) == 10
