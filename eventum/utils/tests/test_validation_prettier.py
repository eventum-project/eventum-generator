from pydantic import BaseModel, Field, ValidationError

from eventum.utils.validation_prettier import prettify_validation_errors


class TestModel(BaseModel):
    field_1: int
    field_2: float = Field(ge=10.0)

    __test__ = False


def test_prettify_validation_errors():
    try:
        TestModel.model_validate({'field_1': 'field_2', 'b': 4})
    except ValidationError as e:
        message = prettify_validation_errors(e.errors())
        assert 'field_1' in message
        assert 'field_2' in message
    else:
        assert False
