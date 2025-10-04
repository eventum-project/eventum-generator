import eventum.utils.tests.static as tests_static
from eventum.utils.package_utils import get_subpackage_names


def test_get_subpackage_names():
    assert get_subpackage_names(tests_static) == ['package1', 'package2']
