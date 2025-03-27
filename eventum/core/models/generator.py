"""Generator specific parameters."""

from pathlib import Path
from typing import Any, Literal

from pydantic import Field, field_validator

from eventum.core.models.generation import GenerationParameters


class GeneratorParameters(GenerationParameters, frozen=True):
    """Parameters for single generator.

    Attributes
    ----------
    id : str
        Generator unique identified.

    path : Path
        Absolute path to configuration.

    time_mode : Literal['live', 'sample'], default='live'
        Whether to use live mode and generate events at moments defined
        by timestamp values or sample mode to generate all events at a
        time.

    skip_past : bool, default=True
        Whether to skip past timestamps when starting generation in
        live mode.

    params: dict[str, Any], default={}
        Parameters that can be used in generator configuration file.

    """

    id: str = Field(min_length=1)
    path: Path
    time_mode: Literal['live', 'sample'] = 'live'
    skip_past: bool = Field(default=True)
    params: dict[str, Any] = Field(default_factory=dict)

    @field_validator('path')
    @classmethod
    def validate_path(cls, v: Path) -> Path:  # noqa: D102
        if v.is_absolute():
            return v

        msg = 'Path must be absolute'
        raise ValueError(msg)
