import tempfile
from pathlib import Path
from shutil import rmtree

import pytest

from eventum.core.generator import Generator
from eventum.core.parameters import GeneratorParameters

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
def generator(file1, file2):
    return Generator(
        params=GeneratorParameters(
            id='test',
            path=CONFIG_PATH,
            live_mode=False,
            params={'file1': str(file1), 'file2': str(file2)},
        ),
    )


def test_generator(generator):
    generator.start()

    generator.join()

    assert generator.is_ended_up
    assert generator.is_ended_up_successfully

    file1 = generator.params.params['file1']
    file2 = generator.params.params['file2']

    with Path(file1).open() as f:
        lines_1 = f.readlines()

    with Path(file2).open() as f:
        lines_2 = f.readlines()

    assert len(lines_1) == len(lines_2) == 200
    assert set(lines_1) == set(lines_1) == {'o_O\n'}
