"""Generator config routes."""

import shutil
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException, status

from eventum.api.dependencies import SettingsDep
from eventum.core.config import GeneratorConfig

GENERATOR_CONFIG_FILENAME = 'generator.yml'

router = APIRouter(
    prefix='/generator_configs',
    tags=['Generator configs'],
)


@router.get(
    '/',
    description=(
        'List all directories with generator configurations. Note that '
        'generator configurations are only searched recursively inside '
        'directory specified in `path.generators_dir` setting by name '
        f'`{GENERATOR_CONFIG_FILENAME}`.'
    ),
    response_description=(
        'Relative paths to generator configuration directories'
    ),
)
def list_generator_configs(settings: SettingsDep) -> list[str]:
    if not settings.path.generators_dir.exists():
        return []

    return [
        str(path.relative_to(settings.path.generators_dir).parent)
        for path in settings.path.generators_dir.glob(
            f'**/{GENERATOR_CONFIG_FILENAME}',
        )
    ]


@router.post(
    '/',
    description=(
        'Create directory with generator configuration in the specified path, '
        'that should be relative to `path.generators_dir` setting.'
    ),
    responses={
        403: {
            'description': (
                'Creating configuration outside generators directory '
                'is not allowed'
            ),
        },
        409: {
            'description': 'Configuration already exists on this path',
        },
        500: {
            'description': 'Creation failed due to OS error',
        },
    },
)
def create_generator_config(
    config: GeneratorConfig,
    path: Path,
    settings: SettingsDep,
) -> None:
    generator_config_dir = (settings.path.generators_dir / path).resolve()
    if not generator_config_dir.is_relative_to(settings.path.generators_dir):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                'Creating of generator configuration outside '
                f'"{settings.path.generators_dir}" directory is not allowed'
            ),
        )

    generator_config_path = generator_config_dir / GENERATOR_CONFIG_FILENAME

    try:
        generator_config_dir.mkdir(parents=True, exist_ok=False)
        with generator_config_path.open('w') as f:
            yaml.dump(data=config.model_dump(), stream=f, sort_keys=False)
    except FileExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=('Configuration already exists on this path'),
        ) from None
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Failed to create configuration: {e}'),
        ) from None


@router.put(
    '/',
    description=(
        'Update generator configuration in the specified directory path, that '
        'should be relative to `path.generators_dir`.'
    ),
    responses={
        403: {
            'description': (
                'Updating configuration outside generators directory '
                'is not allowed'
            ),
        },
        404: {
            'description': 'Configuration does not exist on this path',
        },
        500: {
            'description': 'Updating failed due to OS error',
        },
    },
)
def update_generator_config(
    config: GeneratorConfig,
    path: Path,
    settings: SettingsDep,
) -> None:
    generator_config_dir = (settings.path.generators_dir / path).resolve()
    if not generator_config_dir.is_relative_to(settings.path.generators_dir):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                'Updating of generator configuration outside '
                f'"{settings.path.generators_dir}" directory is not allowed'
            ),
        )

    generator_config_path = generator_config_dir / GENERATOR_CONFIG_FILENAME

    if not generator_config_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Configuration does not exist',
        )

    try:
        with generator_config_path.open('w') as f:
            yaml.dump(data=config.model_dump(), stream=f, sort_keys=False)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Failed to update generator configuration: {e}'),
        ) from None


@router.delete(
    '/',
    description=(
        'Delete generator configuration in the specified directory path, '
        'that should be relative to `path.generators_dir` setting.'
    ),
    responses={
        404: {
            'description': 'Configuration does not exist on this path',
        },
        500: {
            'description': 'Deletion failed due to OS error',
        },
    },
)
def delete_generator_configs(
    path: Path,
    settings: SettingsDep,
) -> None:
    generator_config_dir = (settings.path.generators_dir / path).resolve()
    if not generator_config_dir.is_relative_to(settings.path.generators_dir):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                'Deletion of generator configuration outside '
                f'"{settings.path.generators_dir}" directory is not allowed'
            ),
        )

    if not generator_config_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=('Configuration does not exist'),
        )

    try:
        shutil.rmtree(generator_config_dir)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Failed to delete generator configuration: {e}'),
        ) from None
