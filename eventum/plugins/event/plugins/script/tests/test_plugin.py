from datetime import datetime
from pathlib import Path

import pytest

from eventum.plugins.event.exceptions import PluginProduceError
from eventum.plugins.event.plugins.script.config import ScriptEventPluginConfig
from eventum.plugins.event.plugins.script.plugin import ScriptEventPlugin
from eventum.plugins.exceptions import PluginConfigurationError

STATIC_DIR = Path(__file__).parent / 'static'


def test_plugin_one_event():
    plugin = ScriptEventPlugin(
        config=ScriptEventPluginConfig(path=STATIC_DIR / 'one_event.py'),
        params={'id': 1},
    )

    ts = datetime.now().astimezone()
    tags = ('tag1', 'tag2')
    events = plugin.produce(params={'timestamp': ts, 'tags': tags})

    assert events == [f'{ts.isoformat()}, {tags}']


def test_plugin_events_list():
    plugin = ScriptEventPlugin(
        config=ScriptEventPluginConfig(path=STATIC_DIR / 'events_list.py'),
        params={'id': 1},
    )

    ts = datetime.now().astimezone()
    tags = ('tag1', 'tag2')
    events = plugin.produce(params={'timestamp': ts, 'tags': tags})

    assert events == [ts.isoformat(), *tags]


def test_plugin_missing_function():
    with pytest.raises(PluginConfigurationError):
        ScriptEventPlugin(
            config=ScriptEventPluginConfig(
                path=STATIC_DIR / 'missing_function.py'
            ),
            params={'id': 1},
        )


def test_plugin_exception_in_definition():
    with pytest.raises(PluginConfigurationError):
        ScriptEventPlugin(
            config=ScriptEventPluginConfig(
                path=STATIC_DIR / 'exception_in_definition.py'
            ),
            params={'id': 1},
        )


def test_plugin_exception_in_function():
    plugin = ScriptEventPlugin(
        config=ScriptEventPluginConfig(
            path=STATIC_DIR / 'exception_in_function.py'
        ),
        params={'id': 1},
    )

    with pytest.raises(PluginProduceError):
        plugin.produce(
            params={
                'timestamp': datetime.now().astimezone(),
                'tags': ('tag1', 'tag2'),
            }
        )


def test_plugin_unexistent_file():
    with pytest.raises(PluginConfigurationError):
        ScriptEventPlugin(
            config=ScriptEventPluginConfig(path=STATIC_DIR / 'abcdefg.py'),
            params={'id': 1},
        )
