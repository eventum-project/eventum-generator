from pydantic import BaseModel, Field
from pydantic_core import ErrorDetails

from eventum.utils.validation_prettier import prettify_validation_errors


class TestModel(BaseModel):
    field_1: int
    field_2: float = Field(ge=10.0)

    __test__ = False


def test_prettify_validation_errors():
    errors = [
        ErrorDetails(
            loc=('field1', 'nested_field1'),
            msg='Error message 1',
            type='type1',
            input='input1',
        ),
        ErrorDetails(
            loc=('field2', 'nested_field2'),
            msg='Error message 2',
            type='type2',
            input='input2',
        ),
    ]

    expected_output = (
        '"field1.nested_field1": \'input1\' - error message 1 (type1); '
        '"field2.nested_field2": \'input2\' - error message 2 (type2)'
    )

    assert prettify_validation_errors(errors) == expected_output
