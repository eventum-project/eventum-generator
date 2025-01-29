import os
from pydantic import BaseModel, Field, field_validator


class PathParameters(BaseModel, extra='forbid', frozen=True):
    """Path parameters.

    Attributes
    ----------
    logs : str
        Absolute path to logs directory

    generators : str
        Absolute path to file with generator definitions
    """
    logs: str = Field(min_length=1)
    generators: str = Field(min_length=1)

    @field_validator('logs', 'generators')
    def validate_paths(cls, v: str):
        if os.path.isabs(v):
            return v
        raise ValueError('Path must be absolute')
