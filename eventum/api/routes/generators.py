"""Generator routes."""

from fastapi import APIRouter, HTTPException, status

from eventum.api.dependencies import GeneratorManagerDep
from eventum.app.manager import ManagingError
from eventum.core.parameters import GeneratorParameters

router = APIRouter(
    prefix='/generators',
    tags=['Generators'],
)


@router.get(
    '/',
    description='List all ids of registered generators',
    response_description='Generators ids',
)
def list_generators(generator_manager: GeneratorManagerDep) -> list[str]:
    return generator_manager.generator_ids


@router.post(
    '/{id}/',
    description=(
        'Add generator. Note that `id` path parameter takes precedence '
        'over `id` field in the body.'
    ),
    responses={
        409: {'description': 'Generator with provided id already exists'},
    },
)
def add_generator(
    id: str,
    params: GeneratorParameters,
    generator_manager: GeneratorManagerDep,
) -> None:
    params = GeneratorParameters(id=id, **params.model_dump())
    try:
        generator_manager.add(params)
    except ManagingError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from None


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
