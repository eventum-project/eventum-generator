"""Routes."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Body, HTTPException, Query, status

from eventum.api.dependencies.app import SettingsDep
from eventum.api.routes.generator_configs.dependencies import (
    CheckConfigurationExistsDep,
    CheckDirectoryIsAllowedDep,
    check_configuration_exists,
    check_directory_is_allowed,
)
from eventum.api.routes.preview.dependencies import (
    EventPluginDep,
    InputPluginsDep,
    SpanDep,
    get_span,
    load_event_plugin,
    load_input_plugins,
)
from eventum.api.routes.preview.models import (
    AggregatedTimestamps,
    ProducedEventsInfo,
    ProduceEventErrorInfo,
)
from eventum.api.routes.preview.plugins_storage import EVENT_PLUGINS
from eventum.api.routes.preview.timestamps_aggregation import (
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

router = APIRouter(
    prefix='/preview',
    tags=['Preview'],
)


@router.post(
    '/{name}/input',  # noqa: FAST003
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
    '/{name}/event/initialize',  # noqa: FAST003
    description='Initialize event plugin',
    responses=merge_responses(load_event_plugin.responses),
)
async def initialize_event_plugin(
    plugin: EventPluginDep,
) -> None:
    EVENT_PLUGINS.set(path=plugin.base_path, plugin=plugin)


@router.post(
    '/{name}/event/produce',
    description='Produce events using initialized event plugin',
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        {400: {'description': 'Event plugin was not previously initialized'}},
    ),
)
async def produce_events(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    settings: SettingsDep,
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
    path = (settings.path.generators_dir / name).resolve()

    if not EVENT_PLUGINS.is_set(path=path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Event plugin was not previously initialized',
        )

    plugin = EVENT_PLUGINS.get(path)

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
