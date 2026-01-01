from pathlib import Path

from eventum.utils.fs_utils import (
    calculate_dir_size,
    get_dir_last_modification_time,
)

STATIC_DIR = Path(__file__).parent / 'static' / 'dir_to_calculate_size'


def test_calculate_dir_size():
    assert calculate_dir_size(STATIC_DIR) == 80


def test_get_dir_last_modification_time():
    assert get_dir_last_modification_time(STATIC_DIR) > 1762424853
