"""Routes."""

import asyncio
from typing import Annotated

import aiofiles
import yaml
from fastapi import APIRouter, Body, HTTPException, status

from eventum.api.dependencies.app import SettingsDep
from eventum.api.routers.startup.dependencies import (
    CheckIdInBodyMatchPathDep,
    StartupGeneratorsParametersDep,
    TargetStartupParamsIndexDep,
    check_id_in_body_match_path,
    get_startup_generators_parameters,
    get_target_startup_params_index,
)
from eventum.api.utils.response_description import merge_responses
from eventum.app.models.generators import GeneratorsParameters
from eventum.core.parameters import GeneratorParameters

router = APIRouter()


@router.get(
    '/',
    description='Get list of generator definitions in the startup file',
    response_description=(
        'List of parameters of generators in the startup file. '
        'Note that response also includes default parameters '
        'even if they are not set in the file.'
    ),
    responses=get_startup_generators_parameters.responses,
)
async def get_generators_in_startup(
    generators_parameters: StartupGeneratorsParametersDep,
    settings: SettingsDep,
) -> GeneratorsParameters:
    generators_parameters_model, _ = generators_parameters

    normalized_params_list: list[GeneratorParameters] = []
    for params in generators_parameters_model.root:
        try:
            normalized_params = params.as_relative(
                base_dir=settings.path.generators_dir,
            )
        except ValueError:
            normalized_params = params

        normalized_params_list.append(normalized_params)

    return GeneratorsParameters(root=tuple(normalized_params_list))


@router.get(
    '/{id}',
    description='Get generator definition from list in the startup file',
    response_description=(
        'Parameters of generator from the startup file. '
        'Note that response also includes default parameters '
        'even if they are not set in the file.'
    ),
    responses=merge_responses(
        get_startup_generators_parameters.responses,
        get_target_startup_params_index.responses,
    ),
)
async def get_generator_from_startup(
    generators_parameters: StartupGeneratorsParametersDep,
    target_index: TargetStartupParamsIndexDep,
    settings: SettingsDep,
) -> GeneratorParameters:
    generators_parameters_model, _ = generators_parameters

    target_params = generators_parameters_model.root[target_index]
    try:
        return target_params.as_relative(base_dir=settings.path.generators_dir)
    except ValueError:
        return target_params


@router.post(
    '/{id}',
    description='Add generator definition to list in the startup file',
    responses=merge_responses(
        get_startup_generators_parameters.responses,
        check_id_in_body_match_path.responses,
        {409: {'description': 'Generator with this ID is already defined'}},
        {
            500: {
                'description': (
                    'Cannot append updated content to startup file '
                    'due to OS error'
                ),
            },
        },
    ),
)
async def add_generator_to_startup(
    id: CheckIdInBodyMatchPathDep,
    params: Annotated[
        GeneratorParameters,
        Body(description='Generator parameters'),
    ],
    generators_parameters: StartupGeneratorsParametersDep,
    settings: SettingsDep,
) -> None:
    generators_parameters_model, _ = generators_parameters

    for startup_params in generators_parameters_model.root:
        if id == startup_params.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    'Generator with this ID is already defined '
                    f'({startup_params.path})'
                ),
            )

    content_to_add = await asyncio.to_thread(
        lambda: yaml.dump(
            [
                params.as_absolute(
                    base_dir=settings.path.generators_dir,
                ).model_dump(
                    exclude_unset=True,
                ),
            ],
        ),
    )

    try:
        async with aiofiles.open(settings.path.startup, 'a') as f:
            await f.write(content_to_add)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                'Cannot append updated content to startup file '
                f'due to OS error: {e}'
            ),
        ) from None


@router.put(
    '/{id}',
    description='Update generator definition in list in the startup file',
    responses=merge_responses(
        get_startup_generators_parameters.responses,
        get_target_startup_params_index.responses,
        check_id_in_body_match_path.responses,
        {
            500: {
                'description': ('Cannot modify startup file due to OS error'),
            },
        },
    ),
)
async def update_generator_in_startup(
    id: CheckIdInBodyMatchPathDep,  # noqa: ARG001
    params: Annotated[
        GeneratorParameters,
        Body(description='Generator parameters'),
    ],
    target_index: TargetStartupParamsIndexDep,
    generators_parameters: StartupGeneratorsParametersDep,
    settings: SettingsDep,
) -> None:
    _, generators_parameters_raw_content = generators_parameters

    generators_parameters_raw_content[target_index] = params.as_absolute(
        base_dir=settings.path.generators_dir,
    ).model_dump(
        exclude_unset=True,
    )
    new_content = await asyncio.to_thread(
        lambda: yaml.dump(generators_parameters_raw_content),
    )

    try:
        async with aiofiles.open(settings.path.startup, 'w') as f:
            await f.write(new_content)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Cannot modify startup file due to OS error: {e}',
        ) from None


@router.delete(
    '/{id}',
    description='Delete generator definition from list in the startup file',
    responses=merge_responses(
        get_startup_generators_parameters.responses,
        get_target_startup_params_index.responses,
        {
            500: {
                'description': ('Cannot modify startup file due to OS error'),
            },
        },
    ),
)
async def delete_generator_from_startup(
    generators_parameters: StartupGeneratorsParametersDep,
    target_index: TargetStartupParamsIndexDep,
    settings: SettingsDep,
) -> None:
    _, generators_parameters_raw_content = generators_parameters

    del generators_parameters_raw_content[target_index]
    new_content = await asyncio.to_thread(
        lambda: yaml.dump(generators_parameters_raw_content),
    )

    try:
        async with aiofiles.open(settings.path.startup, 'w') as f:
            await f.write(new_content)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Cannot modify startup file due to OS error: {e}',
        ) from None
