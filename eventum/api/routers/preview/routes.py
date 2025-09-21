"""Routes."""

import asyncio  # noqa: I001
from typing import Annotated, Any

from fastapi import APIRouter, Body, HTTPException, Query, status

from eventum.api.dependencies.app import SettingsDep
from eventum.api.routers.generator_configs.dependencies import (
    CheckConfigurationExistsDep,
    CheckDirectoryIsAllowedDep,
    check_configuration_exists,
    check_directory_is_allowed,
)
from eventum.api.routers.preview.dependencies import (
    EventPluginDep,
    EventPluginFromStorageDep,
    InputPluginsDep,
    JinjaEventPluginGlobalStateDep,
    JinjaEventPluginLocalStateDep,
    JinjaEventPluginSharedStateDep,
    SpanDep,
    get_event_plugin_from_storage,
)
from eventum.api.routers.preview.dependencies import (
    get_jinja_event_plugin_global_state as get_jinja_global_state,
)
from eventum.api.routers.preview.dependencies import (
    get_jinja_event_plugin_local_state as get_jinja_local_state,
)
from eventum.api.routers.preview.dependencies import (
    get_jinja_event_plugin_shared_state as get_jinja_shared_state,
)
from eventum.api.routers.preview.dependencies import (
    get_span,
    load_event_plugin,
    load_input_plugins,
)
from eventum.api.routers.preview.models import (
    AggregatedTimestamps,
    FormatErrorInfo,
    FormatEventsBody,
    FormattingResult,
    ProducedEventsInfo,
    ProduceEventErrorInfo,
)
from eventum.api.routers.preview.plugins_storage import EVENT_PLUGINS
from eventum.api.routers.preview.timestamps_aggregation import (
    aggregate_timestamps,
)
from eventum.api.utils.response_description import merge_responses
from eventum.plugins.event.base.plugin import ProduceParams
from eventum.plugins.event.exceptions import (
    PluginExhaustedError,
    PluginProduceError,
)
from eventum.plugins.input.exceptions import PluginGenerationError
from eventum.plugins.input.merger import InputPluginsMerger
from eventum.plugins.output.formatters import get_formatter_class
from eventum.utils.json_utils import normalize_types

router = APIRouter(
    prefix='/preview',
    tags=['Preview'],
)


@router.post(
    '/{name}/input_plugins/generate',
    description='Generate timestamps using input plugins',
    response_description='Generated timestamps',
    responses=merge_responses(
        load_input_plugins.responses,
        get_span.responses,
        {500: {'description': 'Failed to generate timestamps'}},
    ),
)
async def generate_timestamps(
    plugins: InputPluginsDep,
    span: SpanDep,
    size: Annotated[
        int,
        Query(ge=1, description='Number of timestamps to generate'),
    ] = 1_000,
    skip_past: Annotated[  # noqa: FBT002
        bool,
        Query(description='Whether to skip past timestamps in generation'),
    ] = True,
) -> AggregatedTimestamps:
    non_interactive_plugins = list(
        filter(lambda plugin: not plugin.is_interactive, plugins),
    )

    if not non_interactive_plugins:
        return AggregatedTimestamps(span_edges=[], span_counts={})

    merged_plugins = InputPluginsMerger(plugins=non_interactive_plugins)
    iterator = merged_plugins.iterate(size=size, skip_past=skip_past)

    try:
        timestamps = next(iterator)
    except PluginGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                'message': f'Failed to generate timestamps: {e}',
                'context': e.context,
            },
        ) from None

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor=None,
        func=lambda: aggregate_timestamps(timestamps=timestamps, span=span),
    )


@router.post(
    '/{name}/event_plugin',
    description='Initialize event plugin',
    responses=merge_responses(load_event_plugin.responses),
)
async def initialize_event_plugin(
    plugin: EventPluginDep,
) -> None:
    EVENT_PLUGINS.set(path=plugin.base_path, plugin=plugin)


@router.post(
    '/{name}/event_plugin/produce',
    description='Produce events using initialized event plugin',
    responses=merge_responses(get_event_plugin_from_storage.responses),
)
async def produce_events(
    plugin: EventPluginFromStorageDep,
    params_list: Annotated[
        list[ProduceParams],
        Body(
            description=(
                'List of timestamps and input plugins tags to use '
                'for producing events'
            ),
        ),
    ],
) -> ProducedEventsInfo:
    events: list[str] = []
    errors: list[tuple[int, PluginProduceError]] = []
    exhausted = False

    for i, params in enumerate(params_list):
        try:
            events.extend(plugin.produce(params=params))
        except PluginProduceError as e:
            errors.append((i, e))
        except PluginExhaustedError:
            exhausted = True
            break

    return ProducedEventsInfo(
        events=events,
        errors=[
            ProduceEventErrorInfo(
                index=i,
                message=str(error),
                context=error.context,
            )
            for i, error in errors
        ],
        exhausted=exhausted,
    )


@router.delete(
    '/{name}/event_plugin',
    description='Release event plugin with freeing acquired resource',
    responses=merge_responses(get_event_plugin_from_storage.responses),
)
async def release_event_plugin(plugin: EventPluginFromStorageDep) -> None:
    EVENT_PLUGINS.remove(plugin.base_path)


@router.get(
    '/{name}/event_plugin/jinja/state/local/{alias}',
    description=(
        'Get local state of jinja event plugin for the specified template '
        'by its alias'
    ),
    responses=merge_responses(
        get_jinja_local_state.responses,
        {500: {'description': 'Failed to serialize plugin state'}},
    ),
)
async def get_jinja_event_plugin_local_state(
    state: JinjaEventPluginLocalStateDep,
) -> dict[str, Any]:
    try:
        return normalize_types(state.as_dict())
    except RuntimeError as e:  # catch recursion errors etc.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to serialize plugin state: {e}',
        ) from None


@router.patch(
    '/{name}/event_plugin/jinja/state/local/{alias}',
    description=(
        'Patch local state of jinja event plugin for the specified template '
        'by its alias'
    ),
    responses=get_jinja_local_state.responses,
)
async def update_jinja_event_plugin_local_state(
    state: JinjaEventPluginLocalStateDep,
    content: Annotated[
        dict[str, Any],
        Body(description='Content to patch in state'),
    ],
) -> None:
    state.update(content)


@router.delete(
    '/{name}/event_plugin/jinja/state/local/{alias}',
    description=(
        'Clear local state of jinja event plugin for the specified template '
        'by its alias'
    ),
    responses=get_jinja_local_state.responses,
)
async def clear_jinja_event_plugin_local_state(
    state: JinjaEventPluginLocalStateDep,
) -> None:
    state.clear()


@router.get(
    '/{name}/event_plugin/jinja/state/shared',
    description='Get shared state of jinja event plugin',
    responses=merge_responses(
        get_jinja_shared_state.responses,
        {500: {'description': 'Failed to serialize plugin state'}},
    ),
)
async def get_jinja_event_plugin_shared_state(
    state: JinjaEventPluginSharedStateDep,
) -> dict[str, Any]:
    try:
        return normalize_types(state.as_dict())
    except RuntimeError as e:  # catch recursion errors etc.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to serialize plugin state: {e}',
        ) from None


@router.patch(
    '/{name}/event_plugin/jinja/state/shared',
    description='Patch shared state of jinja event plugin',
    responses=get_jinja_shared_state.responses,
)
async def update_jinja_event_plugin_shared_state(
    state: JinjaEventPluginSharedStateDep,
    content: Annotated[
        dict[str, Any],
        Body(description='Content to patch in state'),
    ],
) -> None:
    state.update(content)


@router.delete(
    '/{name}/event_plugin/jinja/state/shared',
    description='Clear shared state of jinja event plugin',
    responses=get_jinja_shared_state.responses,
)
async def clear_jinja_event_plugin_shared_state(
    state: JinjaEventPluginSharedStateDep,
) -> None:
    state.clear()


@router.get(
    '/{name}/event_plugin/jinja/state/global',
    description='Get global state of jinja event plugin',
    responses=merge_responses(
        get_jinja_global_state.responses,
        {500: {'description': 'Failed to serialize plugin state'}},
    ),
)
async def get_jinja_event_plugin_global_state(
    state: JinjaEventPluginGlobalStateDep,
) -> dict[str, Any]:
    try:
        return normalize_types(state.as_dict())
    except RuntimeError as e:  # catch recursion errors etc.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to serialize plugin state: {e}',
        ) from None


@router.patch(
    '/{name}/event_plugin/jinja/state/global',
    description='Patch global state of jinja event plugin',
    responses=get_jinja_global_state.responses,
)
async def update_jinja_event_plugin_global_state(
    state: JinjaEventPluginGlobalStateDep,
    content: Annotated[
        dict[str, Any],
        Body(description='Content to patch in state'),
    ],
) -> None:
    state.update(content)


@router.delete(
    '/{name}/event_plugin/jinja/state/global',
    description='Clear global state of jinja event plugin',
    responses=get_jinja_global_state.responses,
)
async def clear_jinja_event_plugin_global_state(
    state: JinjaEventPluginGlobalStateDep,
) -> None:
    state.clear()


@router.post(
    '/{name}/formatter/format',
    description='Format events using specified formatter',
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
    ),
)
async def format_events(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    body: FormatEventsBody,
    settings: SettingsDep,
) -> FormattingResult:
    path = (settings.path.generators_dir / name).resolve()
    Formatter = get_formatter_class(body.formatter_config.format)  # noqa: N806

    formatter = Formatter(
        config=body.formatter_config,
        params={'base_path': path},
    )

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        executor=None,
        func=lambda: formatter.format_events(events=body.events),
    )

    return FormattingResult(
        events=result.events,
        formatted_count=result.formatted_count,
        errors=[
            FormatErrorInfo(
                message=str(error),
                original_event=error.original_event,
            )
            for error in result.errors
        ],
    )
