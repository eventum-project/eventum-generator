from datetime import datetime

import pytest
from numpy import datetime64
from pytz import timezone

from eventum_plugins.input.plugins.cron.config import CronInputPluginConfig
from eventum_plugins.input.plugins.cron.plugin import CronInputPlugin


@pytest.mark.timeout(1)
def test_cron_sample():
    plugin = CronInputPlugin(
        id=1,
        config=CronInputPluginConfig(
            expression='* * * * *',
            count=1,
            start=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone('UTC')),
            end=datetime(2024, 1, 1, 23, 59, 59, tzinfo=timezone('UTC'))
        ),
        live_mode=False,
        timezone=timezone('UTC')
    )

    timestamps = []

    for batch in plugin.generate():
        timestamps.extend(batch)

    assert len(timestamps) == 1440
    assert timestamps[0] == datetime64('2024-01-01T00:00:00')
    assert timestamps[-1] == datetime64('2024-01-01T23:59:00')


@pytest.mark.timeout(5)
def test_cron_live():
    now = datetime.now(tz=timezone('UTC'))
    start = now.replace(microsecond=now.microsecond + 500)
    plugin = CronInputPlugin(
        id=1,
        config=CronInputPluginConfig(
            expression='* * * * * *',
            count=1,
            start=start,
            end='after 2 seconds'
        ),
        live_mode=True,
        timezone=timezone('UTC')
    )

    timestamps = []

    for batch in plugin.generate():
        timestamps.extend(batch)

    assert len(timestamps) == 2
    assert timestamps[0] == datetime64(
        start.replace(second=start.second + 1, microsecond=0, tzinfo=None)
    )
    assert timestamps[-1] == datetime64(
        start.replace(second=start.second + 2, microsecond=0, tzinfo=None)
    )
