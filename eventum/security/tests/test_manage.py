import os
import tempfile

import pytest

from eventum.security.manage import get_secret, remove_secret, set_secret


@pytest.fixture
def temp_keyring_file():
    filename = os.path.join(tempfile.gettempdir(), 'test.cfg')
    yield filename
    if os.path.exists(filename):
        os.remove(filename)


def test_get_secret(temp_keyring_file):
    with pytest.raises(ValueError):
        get_secret('key', temp_keyring_file)


def test_set_secret(temp_keyring_file):
    set_secret('key', 'value', temp_keyring_file)
    assert get_secret('key', temp_keyring_file) == 'value'


def test_remove_secret(temp_keyring_file):
    set_secret('key', 'value', temp_keyring_file)
    assert get_secret('key', temp_keyring_file) == 'value'

    remove_secret('key', temp_keyring_file)

    with pytest.raises(ValueError):
        get_secret('key', temp_keyring_file)
