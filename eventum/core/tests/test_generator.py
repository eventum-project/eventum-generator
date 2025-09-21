import os
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
def results_dir():
    path = Path('/tmp/eventum_tests/')
    path.mkdir(parents=True, exist_ok=True)
    yield path
    rmtree(path)


@pytest.fixture
def generator():
    return Generator(
        params=GeneratorParameters(
            id='test', path=CONFIG_PATH, live_mode=False
        ),
    )


def test_generator(results_dir, generator):
    generator.start()

    generator.join()

    assert generator.is_ended_up
    assert generator.is_ended_up_successfully

    with (results_dir / 'file1.log').open() as f:
        lines_1 = f.readlines()

    with (results_dir / 'file2.log').open() as f:
        lines_2 = f.readlines()

    assert len(lines_1) == len(lines_2) == 200
    assert set(lines_1) == set(lines_1) == {'o_O\n'}
