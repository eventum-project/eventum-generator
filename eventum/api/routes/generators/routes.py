"""Generator routes."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from eventum.api.dependencies.app import GeneratorManagerDep, SettingsDep
from eventum.app.manager import ManagingError
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
def list_generators(generator_manager: GeneratorManagerDep) -> list[str]:
    return generator_manager.generator_ids


@router.get(
    '/{id}/',
    description='Get generator parameters',
    responses={
        404: {'description': 'Generator with provided id is not found'},
    },
)
def get_generator(
    id: str,
    generator_manager: GeneratorManagerDep,
    settings: SettingsDep,
) -> GeneratorParameters:
    try:
        generator = generator_manager.get_generator(id)
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None

    try:
        return generator.params.as_relative(
            base_dir=settings.path.generators_dir,
        )
    except ValueError:
        return generator.params


class GeneratorStatus(BaseModel, frozen=True, extra='forbid'):
    """Status of generator.

    Attributes
    ----------
    is_initializing : bool
        Whether the generator is initializing.

    is_running : bool
        Whether the generator is running.

    is_ended_up : bool
        Whether the generator has ended execution with or without
        errors.

    is_ended_up_successfully : bool
        Whether the generator has ended execution successfully.

    """

    is_initializing: bool
    is_running: bool
    is_ended_up: bool
    is_ended_up_successfully: bool


@router.get(
    '/{id}/status/',
    description='Get generator status',
    responses={
        404: {'description': 'Generator with provided id is not found'},
    },
)
def get_generator_status(
    id: str,
    generator_manager: GeneratorManagerDep,
) -> GeneratorStatus:
    try:
        generator = generator_manager.get_generator(id)
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None

    return GeneratorStatus(
        is_initializing=generator.is_initializing,
        is_running=generator.is_running,
        is_ended_up=generator.is_ended_up,
        is_ended_up_successfully=generator.is_ended_up_successfully,
    )


@router.post(
    '/{id}/',
    description=(
        'Add generator. Note that `id` path parameter takes precedence '
        'over `id` field in the body.'
    ),
    responses={
        409: {'description': 'Generator with provided id already exists'},
        422: {'description': 'No configuration exists in specified path'},
    },
)
def add_generator(
    id: str,
    params: GeneratorParameters,
    generator_manager: GeneratorManagerDep,
    settings: SettingsDep,
) -> None:
    kwargs = params.model_dump()
    kwargs.update(id=id)

    params = GeneratorParameters(**kwargs).as_absolute(
        base_dir=settings.path.generators_dir,
    )

    if not params.path.exists():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'No configuration exists in specified path: {params.path}',
        ) from None

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
    responses={
        404: {'description': 'Generator with provided id is not found'},
        422: {'description': 'No configuration exists in specified path'},
        423: {'description': 'Generator must be stopped before updating'},
    },
)
def update_generator(
    id: str,
    params: GeneratorParameters,
    generator_manager: GeneratorManagerDep,
    settings: SettingsDep,
) -> None:
    try:
        generator = generator_manager.get_generator(id)
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None

    if generator.is_initializing or generator.is_running:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail='Generator must be stopped before updating',
        ) from None

    generator_manager.remove(generator_id=id)

    kwargs = params.model_dump()
    kwargs.update(id=id)
    params = GeneratorParameters(**kwargs).as_absolute(
        base_dir=settings.path.generators_dir,
    )

    if not params.path.exists():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'No configuration exists in specified path: {params.path}',
        ) from None

    generator_manager.add(params=params)


@router.post(
    '/{id}/start/',
    description='Start generator by its id',
    response_description='Working status of generator after start',
    responses={
        404: {'description': 'Generator with provided id is not found'},
    },
)
def start_generator(id: str, generator_manager: GeneratorManagerDep) -> bool:
    try:
        return generator_manager.start(id)
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
def stop_generator(id: str, generator_manager: GeneratorManagerDep) -> None:
    try:
        generator_manager.stop(id)
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
def delete_generator(id: str, generator_manager: GeneratorManagerDep) -> None:
    try:
        generator_manager.remove(id)
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None
