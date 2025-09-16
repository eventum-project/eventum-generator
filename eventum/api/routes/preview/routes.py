"""Routes."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from eventum.api.routes.preview.dependencies import (
    InputPluginsDep,
    SpanDep,
    get_span,
    load_input_plugins,
)
from eventum.api.routes.preview.models import AggregatedTimestamps
from eventum.api.routes.preview.timestamps_aggregation import (
    aggregate_timestamps,
)
from eventum.api.utils.response_description import merge_responses
from eventum.plugins.input.exceptions import PluginGenerationError
from eventum.plugins.input.merger import InputPluginsMerger

router = APIRouter(
    prefix='/preview',
    tags=['Preview'],
)


@router.post(
    '/{name}/input/',  # noqa: FAST003
    description='Generate timestamps of the input plugins',
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
        return AggregatedTimestamps(span_edges=[], span_counts=[])

    merged_plugins = InputPluginsMerger(plugins=non_interactive_plugins)
    iterator = merged_plugins.iterate(size=size, skip_past=skip_past)

    try:
        timestamps_batch = next(iterator)
    except PluginGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                'message': f'Failed to generate timestamps: {e}',
                'context': e.context,
            },
        ) from None

    timestamps = timestamps_batch['timestamp']

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor=None,
        func=lambda: aggregate_timestamps(timestamps=timestamps, span=span),
    )
