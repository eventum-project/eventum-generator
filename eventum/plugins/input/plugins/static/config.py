"""Definition of static input plugin config."""

from pydantic import Field

from eventum.plugins.input.base.config import InputPluginConfig


class StaticInputPluginConfig(InputPluginConfig, frozen=True):
    """Configuration for `static` input plugin.

    Attributes
    ----------
    count : int
        Number of events to generate.

    """

    count: int = Field(gt=0)
