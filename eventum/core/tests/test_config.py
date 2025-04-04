from pathlib import Path

import pytest

from eventum.core.config import GeneratorConfig
from eventum.core.config_loader import ConfigurationLoadError, load

BASE_PATH = Path(__file__).parent

CONFIG_PATH = BASE_PATH / 'static' / 'config.yml'
BAD_TOKENS_CONFIG_PATH = BASE_PATH / 'static' / 'bad_tokens_config.yml'
INVALID_YAML_CONFIG_PATH = BASE_PATH / 'static' / 'invalid_yaml_config.yml'
INVALID_STRUCTURE_CONFIG_PATH = (
    BASE_PATH / 'static' / 'invalid_structure_config.yml'
)


def test_load():
    config = load(path=CONFIG_PATH, params={'stream': 'stdout'})

    assert isinstance(config, GeneratorConfig)
    assert config.output[0]['stdout']['stream'] == 'stdout'


def test_invalid_path():
    with pytest.raises(ConfigurationLoadError):
        load(path=BASE_PATH / 'cha cha cha', params={})


def test_bad_tokens_structure():
    with pytest.raises(ConfigurationLoadError):
        load(path=BAD_TOKENS_CONFIG_PATH, params={'stream': 'stdout'})


def test_invalid_config_yaml():
    with pytest.raises(ConfigurationLoadError):
        load(path=INVALID_YAML_CONFIG_PATH, params={'stream': 'stdout'})


def test_invalid_config_structure():
    with pytest.raises(ConfigurationLoadError):
        load(path=INVALID_STRUCTURE_CONFIG_PATH, params={'stream': 'stdout'})


def test_missing_parameters():
    with pytest.raises(ConfigurationLoadError):
        load(path=CONFIG_PATH, params={})
