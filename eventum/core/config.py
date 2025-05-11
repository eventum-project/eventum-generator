"""Generator configuration model."""

from typing import Annotated, Any

from pydantic import BaseModel, Field, field_validator

type PluginConfigFields = dict[str, Any]

type PluginConfig = Annotated[
    dict[str, PluginConfigFields],
    Field(min_length=1, max_length=1),
]


class GeneratorConfig(BaseModel, frozen=True, extra='forbid'):
    """Configuration of generator.

    Attributes
    ----------
    input : list[PluginConfig]
        List of input plugin configurations.

    event : PluginConfig
        Event plugin configuration.

    output : list[PluginConfig]
        List of output plugin configurations.

    """

    input: list[PluginConfig] = Field(min_length=1)
    event: PluginConfig
    output: list[PluginConfig] = Field(min_length=1)

    @staticmethod
    def _get_input_plugin_names() -> set[str]:
        """Get available names of input plugins."""
        from eventum.plugins.loader import get_input_plugin_names

        return set(get_input_plugin_names())

    @staticmethod
    def _get_event_plugin_names() -> set[str]:
        """Get available names of event plugins."""
        from eventum.plugins.loader import get_event_plugin_names

        return set(get_event_plugin_names())

    @staticmethod
    def _get_output_plugin_names() -> set[str]:
        """Get available names of output plugins."""
        from eventum.plugins.loader import get_output_plugin_names

        return set(get_output_plugin_names())

    @field_validator('input')
    @classmethod
    def validate_input_plugin_names(  # noqa: D102
        cls,
        v: list[PluginConfig],
    ) -> list[PluginConfig]:
        available_names = cls._get_input_plugin_names()

        for plugin_config in v:
            for key in plugin_config:
                if key not in available_names:
                    msg = f'Unknown input plugin `{key}`'
                    raise ValueError(msg)

        return v

    @field_validator('event')
    @classmethod
    def validate_event_plugin_names(  # noqa: D102
        cls,
        v: PluginConfig,
    ) -> PluginConfig:
        available_names = cls._get_event_plugin_names()

        for key in v:
            if key not in available_names:
                msg = f'Unknown event plugin `{key}`'
                raise ValueError(msg)

        return v

    @field_validator('output')
    @classmethod
    def validate_output_plugin_names(  # noqa: D102
        cls,
        v: list[PluginConfig],
    ) -> list[PluginConfig]:
        available_names = cls._get_output_plugin_names()

        for plugin_config in v:
            for key in plugin_config:
                if key not in available_names:
                    msg = f'Unknown output plugin `{key}`'
                    raise ValueError(msg)

        return v
