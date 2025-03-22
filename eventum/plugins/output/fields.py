"""Field definitions used in output plugin configs."""

from abc import ABC
from enum import StrEnum
from pathlib import Path
from typing import Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator


class Format(StrEnum):
    """Format of output events."""

    PLAIN = 'plain'
    JSON = 'json'
    JSON_BATCH = 'json-batch'
    TEMPLATE = 'template'
    TEMPLATE_BATCH = 'template-batch'
    EVENTUM_HTTP_INPUT = 'eventum-http-input'


class BaseFormatterConfig(BaseModel, ABC, frozen=True, extra='forbid'):
    """Base formatter config."""


class SimpleFormatterConfig(BaseFormatterConfig, frozen=True):
    """Config for formats without additional parameters.

    format : Literal[Format.PLAIN, Format.EVENTUM_HTTP_INPUT]
        Target format.
    """

    format: Literal[Format.PLAIN, Format.EVENTUM_HTTP_INPUT]


class JsonFormatterConfig(BaseFormatterConfig, frozen=True):
    """Config for json-like formats.

    Parameters
    ----------
    format : Literal[Format.JSON, Format.JSON_BATCH]
        Target format.

    indent : int, default=0
        Indentation size.

    """

    format: Literal[Format.JSON, Format.JSON_BATCH]
    indent: int = Field(default=0, ge=0)


class TemplateFormatterConfig(BaseFormatterConfig, frozen=True):
    """Config for template-like formats.

    Parameters
    ----------
    format : Literal[Format.TEMPLATE, Format.TEMPLATE_BATCH]
        Target format.

    template : str | None, default=None
        Template content.

    template_path : Path | None, default=None
        Template path.

    Notes
    -----
    Template and template path are mutually exclusive parameters.

    To access original event (for `template` mode) or events sequence
    (for `template-batch` mode) use `event` or `events` variable in
    template correspondingly.

    """

    format: Literal[Format.TEMPLATE, Format.TEMPLATE_BATCH]
    template: str | None = Field(default=None, min_length=1)
    template_path: Path | None = Field(default=None)

    @model_validator(mode='after')
    def validate_template_or_path_provided(self) -> Self:  # noqa: D102
        if self.template is None and self.template_path is None:
            msg = 'Template or template path must be provided'
            raise ValueError(msg)

        if self.template is not None and self.template_path is not None:
            msg = 'Template or template path must be provided, but not both'
            raise ValueError(msg)

        return self

    @field_validator('template_path')
    @classmethod
    def validate_template_path(cls, v: Path | None) -> Path | None:  # noqa: D102
        if v is None:
            return v

        if v.is_absolute():
            msg = 'Template path must be relative'
            raise ValueError(msg)

        return v


FormatterConfigT = (
    SimpleFormatterConfig | JsonFormatterConfig | TemplateFormatterConfig
)
