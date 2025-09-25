import pytest

from eventum.utils.json_utils import normalize_types


class Dummy:
    def __repr__(self):
        return '<Dummy>'


@pytest.mark.parametrize(
    'input_value,expected',
    [
        (1, 1),  # int
        (3.14, 3.14),  # float
        (True, True),  # bool
        (None, None),  # None
        ('string', 'string'),  # str
        (Dummy(), '<Dummy>'),  # custom object
        ([1, 'x', 2.0], [1, 'x', 2.0]),  # list
        (
            {'a': 1, 'b': 'x', 'c': [Dummy(), 2]},
            {'a': 1, 'b': 'x', 'c': ['<Dummy>', 2]},
        ),  # nested dict
        (
            {'nested': {'inner': {'val': 'y'}}},
            {'nested': {'inner': {'val': 'y'}}},
        ),  # deep nesting
    ],
)
def test_normalize_types(input_value, expected):
    assert normalize_types(input_value) == expected


def test_unhashable_values():
    s = {1, 2, 3}
    t = (1, 2)
    assert normalize_types(s) == repr(s)
    assert normalize_types(t) == repr(t)
