"""Annotations."""

from typing import Literal, Union, assert_never

from pydantic import BaseModel, create_model

from eventum.plugins.base.config import PluginConfig
from eventum.plugins.loader import (
    get_event_plugin_names,
    get_input_plugin_names,
    get_output_plugin_names,
    load_event_plugin,
    load_input_plugin,
    load_output_plugin,
)


class PluginNamedConfig(BaseModel, frozen=True, extra='forbid'):
    """Model that have one field with previously unknown name which is
    a plugin name and plugin config model instance in its value.

    For accessing this field `get_name` and `get_config`
    methods can be used.
    """

    def get_name(self) -> str:
        """Get plugin name.

        Returns
        -------
        str
            Plugin name name.

        """
        try:
            return next(iter(self.model_fields_set))
        except StopIteration:
            msg = 'Model has no fields'
            raise TypeError(msg) from None

    def get_config(self) -> PluginConfig:
        """Get plugin config.

        Returns
        -------
        PluginConfig
            Plugin config.

        """
        field_name = self.get_name()

        return getattr(self, field_name)


def _generate_plugin_config_models(
    plugin_type: Literal['input', 'event', 'output'],
) -> tuple[PluginNamedConfig, ...]:
    """Generate plugin configuration models with plugin name
    field and plugin configuration in value of this field.

    Parameters
    ----------
    plugin_type : Literal['input', 'event', 'output']
        Plugins type to generate models for.

    Returns
    -------
    tuple[DynamicSingleFieldModel, ...]
        Generated pydantic models.

    """
    match plugin_type:
        case 'input':
            plugin_names = get_input_plugin_names()
            loader = load_input_plugin
        case 'event':
            plugin_names = get_event_plugin_names()
            loader = load_event_plugin
        case 'output':
            plugin_names = get_output_plugin_names()
            loader = load_output_plugin
        case t:
            assert_never(t)

    config_dicts: list[PluginNamedConfig] = []
    for name in plugin_names:
        plugin = loader(name)
        model = create_model(  # type: ignore[call-overload]
            name,
            **{name: (plugin.config_cls, ...)},  # type: ignore[arg-type]
            __base__=(PluginNamedConfig,),
        )
        config_dicts.append(model)

    return tuple(config_dicts)


type InputPluginNamedConfig = Union[*_generate_plugin_config_models('input')]  # type: ignore  # noqa: PGH003
type EventPluginNamedConfig = Union[*_generate_plugin_config_models('event')]  # type: ignore  # noqa: PGH003
type OutputPluginNamedConfig = Union[*_generate_plugin_config_models('output')]  # type: ignore  # noqa: PGH003


class GeneratorConfig(BaseModel, extra='forbid', frozen=True):
    """Type-resolved version of generator configuration.

    Attributes
    ----------
    input : list[InputPluginNamedConfig]
        List of input plugin named configurations.

    event : EventPluginNamedConfig
        Event plugin named configuration.

    output : list[OutputPluginNamedConfig]
        List of output plugin named configurations.

    Notes
    -----
    See `GeneratorConfig` from `eventum.core.config`.

    """

    input: list[InputPluginNamedConfig]
    event: EventPluginNamedConfig
    output: list[OutputPluginNamedConfig]
