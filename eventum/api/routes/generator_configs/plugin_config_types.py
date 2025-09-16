"""Annotations."""

from typing import Literal, Union, assert_never

from pydantic import BaseModel, create_model

from eventum.plugins.loader import (
    get_event_plugin_names,
    get_input_plugin_names,
    get_output_plugin_names,
    load_event_plugin,
    load_input_plugin,
    load_output_plugin,
)


def _generate_plugin_config_models(
    plugin_type: Literal['input', 'event', 'output'],
) -> tuple[BaseModel, ...]:
    """Generate plugin configuration models with plugin name in
    root.

    Parameters
    ----------
    plugin_type : Literal['input', 'event', 'output']
        Plugins type to generate models for.

    Returns
    -------
    tuple[BaseModel, ...]
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

    config_dicts: list[BaseModel] = []
    for name in plugin_names:
        plugin = loader(name)
        model = create_model(  # type: ignore[call-overload]
            name,
            **{name: (plugin.config_cls, ...)},  # type: ignore[arg-type]
            __config__={'extra': 'forbid', 'frozen': True},
        )
        config_dicts.append(model)

    return tuple(config_dicts)


type InputPluginConfigDicts = Union[*_generate_plugin_config_models('input')]  # type: ignore  # noqa: PGH003
type EventPluginConfigDicts = Union[*_generate_plugin_config_models('event')]  # type: ignore  # noqa: PGH003
type OutputPluginConfigDicts = Union[*_generate_plugin_config_models('output')]  # type: ignore  # noqa: PGH003


class GeneratorConfig(BaseModel, extra='forbid', frozen=True):
    """Type-resolved version of generator configuration.

    Attributes
    ----------
    input : list[InputPluginConfigDicts]
        List of input plugin configurations.

    event : EventPluginConfigDicts
        Event plugin configuration.

    output : list[OutputPluginConfigDicts]
        List of output plugin configurations.

    Notes
    -----
    See `GeneratorConfig` from `eventum.core.config`.

    """

    input: list[InputPluginConfigDicts]
    event: EventPluginConfigDicts
    output: list[OutputPluginConfigDicts]
