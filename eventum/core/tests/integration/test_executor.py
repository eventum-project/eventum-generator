import tempfile
from pathlib import Path

import pytest
from pytz import timezone

from eventum.core.executor import Executor
from eventum.core.parameters import GeneratorParameters
from eventum.plugins.event.plugins.template.config import (
    TemplateConfigForGeneralModes,
    TemplateEventPluginConfig,
    TemplateEventPluginConfigForGeneralModes,
    TemplatePickingMode,
)
from eventum.plugins.event.plugins.template.plugin import TemplateEventPlugin
from eventum.plugins.input.plugins.static.config import StaticInputPluginConfig
from eventum.plugins.input.plugins.static.plugin import StaticInputPlugin
from eventum.plugins.output.plugins.file.config import FileOutputPluginConfig
from eventum.plugins.output.plugins.file.plugin import FileOutputPlugin

BASE_PATH = Path(__file__).resolve().parent
GENERATOR_DIR = BASE_PATH / 'static'
TEMPLATE_PATH = (GENERATOR_DIR / 'template.jinja').relative_to(GENERATOR_DIR)
CONFIG_PATH = GENERATOR_DIR / 'test.yml'


@pytest.fixture
def temp_dir():
    return tempfile.TemporaryDirectory()


@pytest.fixture
def file1(temp_dir):
    yield Path(temp_dir.name) / 'file1.log'
    temp_dir.cleanup()


@pytest.fixture
def file2(temp_dir):
    yield Path(temp_dir.name) / 'file2.log'
    temp_dir.cleanup()


@pytest.fixture
def executor(file1, file2):
    return Executor(
        input=[
            StaticInputPlugin(
                config=StaticInputPluginConfig(count=100),
                params={
                    'base_path': GENERATOR_DIR,
                    'id': 1,
                    'timezone': timezone('UTC'),
                },
            ),
            StaticInputPlugin(
                config=StaticInputPluginConfig(count=100),
                params={
                    'base_path': GENERATOR_DIR,
                    'id': 2,
                    'timezone': timezone('UTC'),
                },
            ),
        ],
        event=TemplateEventPlugin(
            config=TemplateEventPluginConfig(
                root=TemplateEventPluginConfigForGeneralModes(
                    params={},
                    samples={},
                    mode=TemplatePickingMode.ALL,
                    templates=[
                        {
                            'test': TemplateConfigForGeneralModes(
                                template=TEMPLATE_PATH
                            )
                        }
                    ],
                )
            ),
            params={'base_path': GENERATOR_DIR, 'id': 1},
        ),
        output=[
            FileOutputPlugin(
                config=FileOutputPluginConfig(
                    path=file1,
                    flush_interval=0,
                    write_mode='overwrite',
                ),
                params={'id': 1, 'base_path': GENERATOR_DIR},
            ),
            FileOutputPlugin(
                config=FileOutputPluginConfig(
                    path=file2,
                    flush_interval=0,
                    write_mode='overwrite',
                ),
                params={'id': 2, 'base_path': GENERATOR_DIR},
            ),
        ],
        params=GeneratorParameters(
            id='test', path=CONFIG_PATH, live_mode=False
        ),
    )


def test_executor(executor, file1, file2):
    with tempfile.TemporaryDirectory() as dir:
        executor.execute()

        with file1.open() as f:
            lines_1 = f.readlines()

        with file2.open() as f:
            lines_2 = f.readlines()

        assert len(lines_1) == len(lines_2) == 200
        assert set(lines_1) == set(lines_1) == {'o_O\n'}
