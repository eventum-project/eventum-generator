"""Routes."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from eventum.api.dependencies.app import GeneratorManagerDep, SettingsDep
from eventum.api.routes.generators.dependencies import (
    CheckPathExistsDep,
    GeneratorDep,
    PreparedGeneratorParamsDep,
    check_path_exists,
)
from eventum.api.routes.generators.dependencies import (
    get_generator as _get_generator,
)
from eventum.api.routes.generators.models import GeneratorStatus
from eventum.api.utils.response_description import merge_responses
from eventum.app.manager import ManagingError
from eventum.core.generator import Generator
from eventum.core.parameters import GeneratorParameters

router = APIRouter(
    prefix='/generators',
    tags=['Generators'],
)


@router.get(
    '/',
    description='List ids of all generators',
    response_description='Generators ids',
)
async def list_generators(generator_manager: GeneratorManagerDep) -> list[str]:
    return generator_manager.generator_ids


@router.get(
    '/{id}/',
    description='Get generator parameters',
    responses={**_get_generator.responses},
)
async def get_generator(
    generator: Annotated[Generator, Depends(_get_generator)],
    settings: SettingsDep,
) -> GeneratorParameters:
    try:
        return generator.params.as_relative(
            base_dir=settings.path.generators_dir,
        )
    except ValueError:
        return generator.params


@router.get(
    '/{id}/status/',
    description='Get generator status',
    responses={**_get_generator.responses},
)
async def get_generator_status(
    generator: Annotated[Generator, Depends(_get_generator)],
) -> GeneratorStatus:
    return GeneratorStatus(
        is_initializing=generator.is_initializing,
        is_running=generator.is_running,
        is_ended_up=generator.is_ended_up,
        is_ended_up_successfully=generator.is_ended_up_successfully,
    )


@router.post(
    '/{id}/',  # noqa: FAST003
    description=(
        'Add generator. Note that `id` path parameter takes precedence '
        'over `id` field in the body.'
    ),
    responses=merge_responses(
        check_path_exists.responses,
        {
            409: {'description': 'Generator with provided id already exists'},
            422: {'description': 'No configuration exists in specified path'},
        },
    ),
)
async def add_generator(
    params: Annotated[PreparedGeneratorParamsDep, CheckPathExistsDep],
    generator_manager: GeneratorManagerDep,
) -> None:
    try:
        generator_manager.add(params)
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from None


@router.put(
    '/{id}/',
    description=(
        'Update generator with provided parameters. Note that `id` path '
        'parameter takes precedence over `id` field in the body.'
    ),
    responses=merge_responses(
        _get_generator.responses,
        check_path_exists.responses,
        {
            422: {'description': 'No configuration exists in specified path'},
            423: {'description': 'Generator must be stopped before updating'},
        },
    ),
)
async def update_generator(
    id: str,
    params: Annotated[PreparedGeneratorParamsDep, CheckPathExistsDep],
    generator_manager: GeneratorManagerDep,
    generator: GeneratorDep,
) -> None:
    if generator.is_initializing or generator.is_running:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail='Generator must be stopped before updating',
        ) from None

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        executor=None,
        func=lambda: generator_manager.remove(generator_id=id),
    )

    generator_manager.add(params=params)


@router.post(
    '/{id}/start/',
    description='Start generator by its id',
    response_description='Working status of generator after start',
    responses={
        404: {'description': 'Generator with provided id is not found'},
    },
)
async def start_generator(
    id: str,
    generator_manager: GeneratorManagerDep,
) -> bool:
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(
            executor=None,
            func=lambda: generator_manager.start(id),
        )
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None


@router.post(
    '/{id}/stop/',
    description='Stop generator by its id',
    responses={
        404: {'description': 'Generator with provided id is not found'},
    },
)
async def stop_generator(
    id: str,
    generator_manager: GeneratorManagerDep,
) -> None:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            executor=None,
            func=lambda: generator_manager.stop(id),
        )
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None


@router.delete(
    '/{id}/',
    description='Remove generator by its id. Stop it in case it is running.',
    responses={
        404: {'description': 'Generator with provided id is not found'},
    },
)
async def delete_generator(
    id: str,
    generator_manager: GeneratorManagerDep,
) -> None:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            executor=None,
            func=lambda: generator_manager.remove(id),
        )
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None
