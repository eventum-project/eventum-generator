"""Dependencies."""

import asyncio
from datetime import timedelta
from typing import Annotated

from fastapi import Body, Depends, HTTPException, Query, status
from pytz import BaseTzInfo, UnknownTimeZoneError
from pytz import timezone as to_timezone

from eventum.api.dependencies.app import SettingsDep
from eventum.api.routes.generator_configs.dependencies import (
    CheckConfigurationExistsDep,
    CheckDirectoryIsAllowedDep,
    check_configuration_exists,
    check_directory_is_allowed,
)
from eventum.api.utils.response_description import (
    merge_responses,
    set_responses,
)
from eventum.core.config import PluginConfig
from eventum.core.plugins_initializer import InitializationError, init_plugin
from eventum.plugins.input.base.plugin import InputPlugin
from eventum.plugins.input.utils.relative_time import parse_relative_time


@set_responses(
    responses={
        400: {
            'description': 'Timezone is invalid',
        },
    },
)
def get_timezone(timezone: Annotated[str, Query()] = 'UTC') -> BaseTzInfo:
    """Get timezone.

    Parameters
    ----------
    timezone : str
        Timezone string to parse.

    Returns
    -------
    BaseTzInfo
        Parsed timezone.

    Raises
    ------
    HTTPException
        Timezone is invalid.

    """
    try:
        return to_timezone(timezone)
    except UnknownTimeZoneError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Timezone is invalid',
        ) from None


TimezoneDep = Annotated[BaseTzInfo, Depends(get_timezone)]


@set_responses(
    responses={
        400: {
            'description': 'Span expression is invalid',
        },
    },
)
def get_span(span: Annotated[str | None, Query()] = None) -> timedelta | None:
    """Get timedelta span by parsing span expression.

    Parameters
    ----------
    span : str | None
        Span expression (e.g. `5m`, `30m`, `1h` etc) or `None`.

    Returns
    -------
    timedelta
        Parsed span expression or `None` if span expression is `None`
        that indicates that auto span should be used.

    Raises
    ------
    HTTPException
        Span expression is invalid.

    """
    if span is None:
        return None

    try:
        return parse_relative_time(expression=span)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Span expression is invalid: {e}',
        ) from None


SpanDep = Annotated[timedelta | None, Depends(get_span)]

UTC = to_timezone('UTC')


@set_responses(
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        get_timezone.responses,
        {
            500: {
                'description': 'Some of input plugins cannot be initialized',
            },
        },
    ),
)
async def load_input_plugins(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    plugin_configs: Annotated[list[PluginConfig], Body()],
    settings: SettingsDep,
    timezone: TimezoneDep,
) -> list[InputPlugin]:
    """Load input plugins using provided input plugin configurations.

    Parameters
    ----------
    name : str
        Name of the generator directory.

    plugin_configs : list[PluginConfig]
        Plugin configurations.

    settings : SettingsDep
        Application settings dependency.

    timezone : TimezoneDep, default=UTC
        Timezone dependency.

    Returns
    -------
    list[InputPlugin]
        Loaded input plugins.

    Raises
    ------
    HTTPException
        If some of the plugins cannot be initialized or some of the
        dependency fails to load.

    """
    path = (settings.path.generators_dir / name).resolve()

    plugins: list[InputPlugin] = []
    loop = asyncio.get_running_loop()
    for i, plugin_config in enumerate(plugin_configs):
        plugin_name, plugin_conf = next(iter(plugin_config.items()))

        try:
            plugin = await loop.run_in_executor(
                executor=None,
                func=lambda i=i,  # type: ignore[misc]
                plugin_name=plugin_name,
                plugin_conf=plugin_conf: (
                    init_plugin(
                        name=plugin_name,
                        type='input',
                        config=plugin_conf,
                        params={
                            'id': i,
                            'timezone': timezone,
                            'base_path': path,
                        },
                    )
                ),
            )
        except InitializationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    'message': str(e),
                    'context': e.context,
                },
            ) from None

        plugins.append(plugin)

    return plugins


InputPluginsDep = Annotated[list[InputPlugin], Depends(load_input_plugins)]
