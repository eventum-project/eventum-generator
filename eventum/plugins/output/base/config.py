"""Definition of base output plugin config."""

from abc import ABC

from pydantic import Field

from eventum.plugins.base.config import PluginConfig
from eventum.plugins.output.fields import (
    Format,
    JsonFormatterConfig,
    SimpleFormatterConfig,
    TemplateFormatterConfig,
)
from eventum.plugins.output.syslog import SyslogFormatterConfig

FormatterConfigT = (
    SimpleFormatterConfig
    | JsonFormatterConfig
    | TemplateFormatterConfig
    | SyslogFormatterConfig
)
"""Configuration of any formatter an output plugin can be given."""


class OutputPluginConfig(PluginConfig, ABC, frozen=True):
    """Base config model for output plugins.

    Attributes
    ----------
    formatter : FormatterConfigT, default=SimpleFormatterConfig(...)
        Formatter configuration.

    """

    formatter: FormatterConfigT = Field(
        default_factory=lambda: SimpleFormatterConfig(format=Format.PLAIN),
        validate_default=True,
        discriminator='format',
    )
