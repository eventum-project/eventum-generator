import importlib

import pytest

from eventum.plugins.registry import PluginInfo, PluginsRegistry


@pytest.fixture(autouse=True)
def clean_registry():
    PluginsRegistry.clear()
    yield
    PluginsRegistry.clear()


def test_registry():
    assert not PluginsRegistry.is_registered('input', 'test')

    with pytest.raises(ValueError):
        PluginsRegistry.get_plugin_info('input', 'test')

    PluginsRegistry.register_plugin(
        PluginInfo(name='test', cls=object, config_cls=object, type='input')
    )

    assert PluginsRegistry.is_registered('input', 'test')

    plugin_info = PluginsRegistry.get_plugin_info('input', 'test')

    assert plugin_info.name == 'test'
    assert plugin_info.type == 'input'
    assert plugin_info.cls is object
    assert plugin_info.config_cls is object


def test_registry_clearing():
    PluginsRegistry.register_plugin(
        PluginInfo(name='test', cls=object, config_cls=object, type='input')
    )

    assert PluginsRegistry.is_registered('input', 'test')

    PluginsRegistry.clear()

    assert not PluginsRegistry.is_registered('input', 'test')


def test_plugin_registration():
    PluginsRegistry.clear()

    assert not PluginsRegistry.is_registered('input', 'cron')

    import eventum.plugins.input.plugins.cron.config as config
    import eventum.plugins.input.plugins.cron.plugin as plugin

    importlib.reload(plugin)

    assert PluginsRegistry.is_registered('input', 'cron')

    plugin_info = PluginsRegistry.get_plugin_info('input', 'cron')

    assert plugin_info.name == 'cron'
    assert plugin_info.type == 'input'
    assert plugin_info.cls is plugin.CronInputPlugin
    assert plugin_info.config_cls is config.CronInputPluginConfig
