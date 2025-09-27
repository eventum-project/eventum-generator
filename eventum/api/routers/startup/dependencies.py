"""Dependencies."""

import asyncio
from typing import Annotated

import aiofiles
import yaml
from fastapi import Body, Depends, HTTPException, Path, status
from pydantic import ValidationError

from eventum.api.dependencies.app import SettingsDep
from eventum.api.utils.response_description import (
    merge_responses,
    set_responses,
)
from eventum.app.models.generators import GeneratorsParameters
from eventum.core.parameters import GeneratorParameters
from eventum.utils.validation_prettier import prettify_validation_errors

type GeneratorsParametersRawObject = list[dict]


@set_responses(
    merge_responses(
        {500: {'description': 'Cannot read startup files due to OS error'}},
        {500: {'description': 'Startup file structure is invalid'}},
    ),
)
async def get_startup_generators_parameters(
    settings: SettingsDep,
) -> tuple[GeneratorsParameters, GeneratorsParametersRawObject]:
    """Get startup generator parameters.

    Parameters
    ----------
    settings : SettingsDep
        Application settings dependency.

    Returns
    -------
    tuple[GeneratorsParameters, GeneratorsParametersRawObject]
        Generators parameters from the startup file as model and as
        raw object.

    Raises
    ------
    HTTPException
        If startup file cannot be read due to OS error.

    HTTPException
        If startup file structure is invalid.

    """
    try:
        async with aiofiles.open(settings.path.startup) as f:
            content = await f.read()
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Cannot read startup file due to OS error: {e}',
        ) from None

    parsed_object = await asyncio.to_thread(
        lambda: yaml.load(content, Loader=yaml.SafeLoader),
    )

    if not isinstance(parsed_object, list):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Startup file structure is invalid: object is not a list',
        ) from None

    try:
        return await asyncio.to_thread(
            lambda: GeneratorsParameters.build_over_generation_parameters(
                object=parsed_object,
                generation_parameters=settings.generation,
            ),
        ), parsed_object
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                'Startup file structure is invalid: '
                f'{prettify_validation_errors(e.errors())}'
            ),
        ) from None


StartupGeneratorsParametersDep = Annotated[
    tuple[GeneratorsParameters, GeneratorsParametersRawObject],
    Depends(get_startup_generators_parameters),
]


@set_responses({404: {'description': 'Generator with this ID is not defined'}})
async def get_target_startup_params_index(
    id: Annotated[str, Path(description='ID of the generator', min_length=1)],
    generators_parameters: StartupGeneratorsParametersDep,
) -> int:
    """Get target startup params index.

    Parameters
    ----------
    id : Annotated[str, Path]
        ID of the generator.

    generators_parameters : StartupGeneratorsParametersDep
        Startup generator parameters dependency.

    Returns
    -------
    int
        Index of the target parameters that match provided ID.

    Raises
    ------
    HTTPException
        If generator with this ID is not defined.

    """
    generators_parameters_model, _ = generators_parameters
    for i, startup_params in enumerate(generators_parameters_model.root):
        if id == startup_params.id:
            return i

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Generator with this ID is not defined',
    )


TargetStartupParamsIndexDep = Annotated[
    int,
    Depends(get_target_startup_params_index),
]


@set_responses(
    {
        400: {
            'description': 'ID field in the body does not match ID path parameter',
        },
    },
)
async def check_id_in_body_match_path(
    id: Annotated[str, Path(description='ID of the generator', min_length=1)],
    params: Annotated[
        GeneratorParameters,
        Body(description='Generator parameters'),
    ],
) -> str:
    """Check if ID parameter in body matches ID path parameter.

    Parameters
    ----------
    id : Annotated[str, Path]
        ID path parameter.

    params : Annotated[GeneratorParameters, Body]
        Request body.

    Returns
    -------
    str
        Original id path parameter

    Raises
    ------
    HTTPException
        If ID field in the body does not match ID path parameter.

    """
    if id != params.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='ID field in the body does not match ID path parameter',
        )

    return id


CheckIdInBodyMatchPathDep = Annotated[
    str,
    Depends(check_id_in_body_match_path),
]
