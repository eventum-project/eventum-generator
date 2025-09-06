"""Generator configs routes."""

import shutil
from pathlib import Path
from typing import Annotated

import yaml
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from eventum.api.dependencies import SettingsDep
from eventum.api.routes.generator_configs.dependencies import (
    GeneratorConfigurationFileNameDep,
    check_configuration_exists,
    check_configuration_not_exists,
    check_directory_is_allowed,
)
from eventum.core.config import GeneratorConfig
from eventum.utils.validation_prettier import prettify_validation_errors

router = APIRouter(
    prefix='/generator_configs',
    tags=['Generator configs'],
)


@router.get(
    '/',
    description=(
        'List all directory names inside `path.generators_dir` '
        'with generator configs.'
    ),
    response_description=('Directory names with generator configs'),
)
def list_generator_dirs(
    config_file_name: GeneratorConfigurationFileNameDep,
    settings: SettingsDep,
) -> list[str]:
    if not settings.path.generators_dir.exists():
        return []

    return [
        path.parent.name
        for path in settings.path.generators_dir.glob(f'*/{config_file_name}')
    ]


@router.get(
    '/{name}',
    description=(
        'Get generator configuration in the directory with specified name.'
    ),
    response_description='Generator configuration',
    responses={
        **check_directory_is_allowed.responses,
        **check_configuration_exists.responses,
        422: {
            'description': (
                'Configuration cannot be processed due to parsing '
                'or validation errors'
            ),
        },
        500: {
            'description': 'Configuration cannot be read due to OS error',
        },
    },
)
def get_generator_config(
    name: Annotated[
        str,
        Depends(check_directory_is_allowed),
        Depends(check_configuration_exists),
    ],
    config_file_name: GeneratorConfigurationFileNameDep,
    settings: SettingsDep,
) -> GeneratorConfig:
    path = (settings.path.generators_dir / name / config_file_name).resolve()

    try:
        with path.open() as f:
            config_data = yaml.load(f, yaml.SafeLoader)

        return GeneratorConfig.model_validate(config_data)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Configuration cannot be read due to OS error: {e}'),
        ) from None
    except yaml.error.YAMLError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(f'Configuration cannot be read due to parsing error: {e}'),
        ) from None
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                'Configuration cannot be read due to validation error: '
                f'{prettify_validation_errors(e.errors())}'
            ),
        ) from None


@router.get(
    '/{name}/path',
    description=(
        'Get generator configuration path in the directory with specified '
        'name.'
    ),
    response_description=(
        'Generator configuration path relative to `path.generators_dir`'
    ),
    responses={
        **check_directory_is_allowed.responses,
        **check_configuration_exists.responses,
    },
)
def get_generator_config_path(
    name: Annotated[
        str,
        Depends(check_directory_is_allowed),
        Depends(check_configuration_exists),
    ],
    config_file_name: GeneratorConfigurationFileNameDep,
    settings: SettingsDep,
) -> Path:
    path = (settings.path.generators_dir / name / config_file_name).resolve()
    return path.relative_to(settings.path.generators_dir)


@router.post(
    '/{name}',
    description=(
        'Create generator configuration in the directory with specified name.'
    ),
    responses={
        **check_directory_is_allowed.responses,
        **check_configuration_not_exists.responses,
        500: {
            'description': 'Configuration cannot be created due to OS error',
        },
    },
)
def create_generator_config(
    name: Annotated[
        str,
        Depends(check_directory_is_allowed),
        Depends(check_configuration_not_exists),
    ],
    config: GeneratorConfig,
    config_file_name: GeneratorConfigurationFileNameDep,
    settings: SettingsDep,
) -> None:
    generator_config_dir = (settings.path.generators_dir / name).resolve()

    generator_config_path = generator_config_dir / config_file_name

    try:
        generator_config_dir.mkdir(parents=True, exist_ok=False)
        with generator_config_path.open('w') as f:
            yaml.dump(data=config.model_dump(), stream=f, sort_keys=False)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Failed to create configuration: {e}'),
        ) from None


@router.put(
    '/{name}',
    description=(
        'Update generator configuration in the directory with specified name.'
    ),
    responses={
        **check_directory_is_allowed.responses,
        **check_configuration_exists.responses,
        500: {
            'description': 'Configuration cannot be updated due to OS error',
        },
    },
)
def update_generator_config(
    name: Annotated[
        str,
        Depends(check_directory_is_allowed),
        Depends(check_configuration_exists),
    ],
    config: GeneratorConfig,
    config_file_name: GeneratorConfigurationFileNameDep,
    settings: SettingsDep,
) -> None:
    generator_config_path = (
        settings.path.generators_dir / name / config_file_name
    ).resolve()

    try:
        with generator_config_path.open('w') as f:
            yaml.dump(data=config.model_dump(), stream=f, sort_keys=False)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Configuration cannot be updated due to OS error: {e}'),
        ) from None


@router.delete(
    '/{name}',
    description=(
        'Delete whole generator configuration directory with specified name.'
    ),
    responses={
        **check_directory_is_allowed.responses,
        **check_configuration_exists.responses,
        500: {
            'description': 'Configuration cannot be deleted due to OS error',
        },
    },
)
def delete_generator_configs(
    name: Annotated[
        str,
        Depends(check_directory_is_allowed),
        Depends(check_configuration_exists),
    ],
    settings: SettingsDep,
) -> None:
    generator_config_dir = (settings.path.generators_dir / name).resolve()

    try:
        shutil.rmtree(generator_config_dir)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Configuration cannot be deleted due to OS error: {e}'),
        ) from None
