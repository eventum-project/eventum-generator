import pytest

import eventum.plugins.event.plugins.template.modules as modules
import eventum.plugins.event.plugins.template.modules.rand as rand
from eventum.plugins.event.plugins.template.module_provider import (
    ModuleProvider,
)


@pytest.fixture
def module_provider():
    return ModuleProvider(modules.__name__)


def test_module_loader(module_provider):
    assert module_provider['rand'] == rand


def test_module_loader_from_env(module_provider):
    import cryptography

    assert module_provider['cryptography'] == cryptography


def test_module_loader_invalid(module_provider):
    with pytest.raises(KeyError):
        module_provider['unexistent']
        module_provider['unexistent']
