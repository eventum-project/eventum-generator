"""Tests for imports of output plugin modules."""

import json
import subprocess
import sys

import pytest

MARKER = 'LOADED:'

PROBE = f"""
import importlib
import json
import sys

plugin_module = sys.argv[1]
plugin_class = sys.argv[2]
config_class = sys.argv[3]
config_values = json.loads(sys.argv[4])
dependency_roots = sys.argv[5:]

module = importlib.import_module(plugin_module)
config_module = importlib.import_module(
    plugin_module.rpartition('.')[0] + '.config'
)
config = getattr(config_module, config_class).model_validate(config_values)
getattr(module, plugin_class)(config=config, params={{'id': 1}})
loaded = sorted(
    name
    for name in sys.modules
    if any(
        name == root or name.startswith(f'{{root}}.')
        for root in dependency_roots
    )
)
print('{MARKER}' + ','.join(loaded))
"""


def _modules_loaded_before_the_plugin_opens(
    plugin_module: str,
    plugin_class: str,
    config_class: str,
    config_values: dict[str, object],
    dependency_roots: tuple[str, ...],
) -> list[str]:
    """Build a plugin in a clean interpreter and report which heavy
    dependencies loaded before it opened.
    """
    result = subprocess.run(  # noqa: S603
        [
            sys.executable,
            '-c',
            PROBE,
            plugin_module,
            plugin_class,
            config_class,
            json.dumps(config_values),
            *dependency_roots,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    reported = next(
        line.removeprefix(MARKER)
        for line in result.stdout.splitlines()
        if line.startswith(MARKER)
    )

    return [name for name in reported.split(',') if name]


@pytest.mark.parametrize(
    (
        'plugin_module',
        'plugin_class',
        'config_class',
        'config_values',
        'dependency_roots',
    ),
    [
        (
            'eventum.plugins.output.plugins.s3.plugin',
            'S3OutputPlugin',
            'S3OutputPluginConfig',
            {'bucket': 'lake'},
            ('obstore', 'pyarrow'),
        ),
        (
            'eventum.plugins.output.plugins.clickhouse.plugin',
            'ClickhouseOutputPlugin',
            'ClickhouseOutputPluginConfig',
            {'host': 'localhost', 'table': 'events'},
            ('clickhouse_connect',),
        ),
        (
            'eventum.plugins.output.plugins.kafka.plugin',
            'KafkaOutputPlugin',
            'KafkaOutputPluginConfig',
            {
                'bootstrap_servers': ['localhost:9092'],
                'topic': 'events',
            },
            ('aiokafka',),
        ),
    ],
    ids=('s3', 'clickhouse', 'kafka'),
)
def test_heavy_dependencies_are_not_loaded_before_the_plugin_opens(
    plugin_module: str,
    plugin_class: str,
    config_class: str,
    config_values: dict[str, object],
    dependency_roots: tuple[str, ...],
) -> None:
    """Heavy dependencies wait until the plugin acquires its resource."""
    assert (
        _modules_loaded_before_the_plugin_opens(
            plugin_module,
            plugin_class,
            config_class,
            config_values,
            dependency_roots,
        )
        == []
    )
