"""Routes."""

import asyncio
import shutil
from pathlib import Path
from typing import Annotated

import aiofiles
import yaml
from fastapi import APIRouter, HTTPException, UploadFile, responses, status
from pydantic import ValidationError

from eventum.api.dependencies.app import SettingsDep
from eventum.api.routes.generator_configs.dependencies import (
    CheckConfigurationExistsDep,
    CheckConfigurationNotExistsDep,
    CheckDirectoryIsAllowedDep,
    CheckFilepathIsDirectlyRelativeDep,
    check_configuration_exists,
    check_configuration_not_exists,
    check_directory_is_allowed,
    check_filepath_is_directly_relative,
)
from eventum.api.routes.generator_configs.file_tree import (
    FileNode,
    build_file_tree,
)
from eventum.api.utils.response_description import merge_responses
from eventum.core.config import GeneratorConfig
from eventum.utils.validation_prettier import prettify_validation_errors

router = APIRouter(
    prefix='/generator_configs',
    tags=['Generator configs'],
)


@router.get(
    '/',
    description=(
        'List all generator directory names inside `path.generators_dir` '
        'with generator configs.'
    ),
    response_description=('Directory names with generator configs'),
)
async def list_generator_dirs(settings: SettingsDep) -> list[str]:
    if not settings.path.generators_dir.exists():
        return []

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor=None,
        func=lambda: [
            path.parent.name
            for path in settings.path.generators_dir.glob(
                f'*/{settings.path.generator_config_filename}',
            )
        ],
    )


@router.get(
    '/{name}',
    description=(
        'Get generator configuration in the directory with specified name.'
    ),
    response_description='Generator configuration',
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        {
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
    ),
)
async def get_generator_config(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    settings: SettingsDep,
) -> GeneratorConfig:
    path = (
        settings.path.generators_dir
        / name
        / settings.path.generator_config_filename
    ).resolve()

    try:
        async with aiofiles.open(path) as f:
            raw_yaml = await f.read()

        loop = asyncio.get_running_loop()
        config_data = await loop.run_in_executor(
            executor=None,
            func=lambda: yaml.load(stream=raw_yaml, Loader=yaml.SafeLoader),
        )

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


@router.post(
    '/{name}',
    description=(
        'Create generator configuration in the directory with specified name.'
    ),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_not_exists.responses,
        {
            500: {
                'description': (
                    'Configuration cannot be created due to OS error'
                ),
            },
        },
    ),
)
async def create_generator_config(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationNotExistsDep,
    ],
    config: GeneratorConfig,
    settings: SettingsDep,
) -> None:
    generator_config_dir = (settings.path.generators_dir / name).resolve()

    generator_config_path = (
        generator_config_dir / settings.path.generator_config_filename
    )

    try:
        generator_config_dir.mkdir(parents=True, exist_ok=False)

        async with aiofiles.open(generator_config_path, 'w') as f:
            await f.write(
                yaml.dump(data=config.model_dump(), sort_keys=False),
            )
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Configuration cannot be created due to OS error: {e}'),
        ) from None


@router.put(
    '/{name}',
    description=(
        'Update generator configuration in the directory with specified name.'
    ),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        {
            500: {
                'description': (
                    'Configuration cannot be updated due to OS error'
                ),
            },
        },
    ),
)
async def update_generator_config(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    config: GeneratorConfig,
    settings: SettingsDep,
) -> None:
    generator_config_path = (
        settings.path.generators_dir
        / name
        / settings.path.generator_config_filename
    ).resolve()

    try:
        async with aiofiles.open(generator_config_path, 'w') as f:
            await f.write(
                yaml.dump(data=config.model_dump(), sort_keys=False),
            )
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
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        {
            500: {
                'description': (
                    'Configuration cannot be deleted due to OS error'
                ),
            },
        },
    ),
)
async def delete_generator_config(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    settings: SettingsDep,
) -> None:
    generator_config_dir = (settings.path.generators_dir / name).resolve()

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            executor=None,
            func=lambda: shutil.rmtree(generator_config_dir),
        )
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'Configuration cannot be deleted due to OS error: {e}'),
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
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
    ),
)
def get_generator_config_path(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    settings: SettingsDep,
) -> Path:
    path = (
        settings.path.generators_dir
        / name
        / settings.path.generator_config_filename
    ).resolve()
    return path.relative_to(settings.path.generators_dir)


@router.get(
    '/{name}/file_tree',
    description=(
        'Get file tree of the generator directory with specified name.'
    ),
    response_description=('File tree nodes.'),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        {
            500: {
                'description': 'File tree cannot be built due to OS error',
            },
        },
    ),
)
async def get_generator_file_tree(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    settings: SettingsDep,
) -> list[FileNode]:
    path = (settings.path.generators_dir / name).resolve()

    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(
            executor=None,
            func=lambda: build_file_tree(path).children or [],
        )
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(f'File tree cannot be built due to OS error: {e}'),
        ) from None


@router.get(
    '/{name}/file/{filepath:path}',
    description=(
        'Read file from specified path inside generator directory '
        'with specified name.'
    ),
    response_description=('File content.'),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        check_filepath_is_directly_relative.responses,
        {
            404: {'description': 'File does not exist'},
            500: {'description': 'File cannot be read due to OS error'},
        },
    ),
)
async def get_generator_file(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    filepath: Annotated[Path, CheckFilepathIsDirectlyRelativeDep],
    settings: SettingsDep,
) -> responses.FileResponse:
    path = (settings.path.generators_dir / name / filepath).resolve()

    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='File does not exist',
        )

    try:
        return responses.FileResponse(path=path)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'File cannot be read due to OS error: {e}',
        ) from None


@router.post(
    '/{name}/file/{filepath:path}',
    description=(
        'Upload file to specified path inside generator directory '
        'with specified name.'
    ),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        check_filepath_is_directly_relative.responses,
        {
            409: {'description': 'File already exists'},
            500: {'description': 'File cannot be uploaded due to OS error'},
        },
    ),
)
async def upload_generator_file(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    filepath: Annotated[Path, CheckFilepathIsDirectlyRelativeDep],
    content: UploadFile,
    settings: SettingsDep,
) -> None:
    path = (settings.path.generators_dir / name / filepath).resolve()

    if path.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='File already exists',
        )

    try:
        path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(path, 'wb') as f:
            while chunk := await content.read(1024 * 1024):  # 1MB chunks
                await f.write(chunk)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'File cannot be uploaded due to OS error: {e}',
        ) from None


@router.put(
    '/{name}/file/{filepath:path}',
    description=(
        'Put file to specified path inside generator directory '
        'with specified name.'
    ),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        check_filepath_is_directly_relative.responses,
        {
            404: {'description': 'File does not exist'},
            500: {'description': 'File cannot be uploaded due to OS error'},
        },
    ),
)
async def put_generator_file(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    filepath: Annotated[Path, CheckFilepathIsDirectlyRelativeDep],
    content: UploadFile,
    settings: SettingsDep,
) -> None:
    path = (settings.path.generators_dir / name / filepath).resolve()

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='File does not exist',
        )

    try:
        async with aiofiles.open(path, 'wb') as f:
            while chunk := await content.read(1024 * 1024):  # 1MB chunks
                await f.write(chunk)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'File cannot be uploaded due to OS error: {e}',
        ) from None


@router.delete(
    '/{name}/file/{filepath:path}',
    description=(
        'Delete file in specified path inside generator directory '
        'with specified name.'
    ),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        check_filepath_is_directly_relative.responses,
        {
            404: {'description': 'File does not exist'},
            500: {'description': 'File cannot be deleted due to OS error'},
        },
    ),
)
async def delete_generator_file(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    filepath: Annotated[Path, CheckFilepathIsDirectlyRelativeDep],
    settings: SettingsDep,
) -> None:
    path = (settings.path.generators_dir / name / filepath).resolve()

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='File does not exist',
        )

    loop = asyncio.get_running_loop()
    try:
        if path.is_file():
            await loop.run_in_executor(
                executor=None,
                func=lambda: path.unlink(),
            )
        else:
            await loop.run_in_executor(
                executor=None,
                func=lambda: shutil.rmtree(path),
            )

    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'File cannot be deleted due to OS error: {e}',
        ) from None


@router.post(
    '/{name}/file_move/',
    description=(
        'Move file from source to destination location inside '
        'generator directory with specified name.'
    ),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        check_filepath_is_directly_relative.responses,
        {
            404: {'description': 'Source file does not exist'},
            409: {'description': 'Destination file already exists'},
            500: {'description': 'File cannot be moved due to OS error'},
        },
    ),
)
async def move_generator_file(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    source: Path,
    destination: Path,
    settings: SettingsDep,
) -> None:
    # Checks performed here to avoid mixing `Query` and `Depends` in signature
    source = check_filepath_is_directly_relative(source)
    destination = check_filepath_is_directly_relative(destination)

    source = (settings.path.generators_dir / name / source).resolve()
    destination = (settings.path.generators_dir / name / destination).resolve()

    if not source.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Source file does not exist',
        )

    if destination.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Destination file already exists',
        )

    if source == destination:
        return

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            executor=None,
            func=lambda: shutil.move(src=source, dst=destination),
        )
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'File cannot be moved due to OS error: {e}',
        ) from None


@router.post(
    '/{name}/file_copy/',
    description=(
        'Copy file from source to destination location inside '
        'generator directory with specified name.'
    ),
    responses=merge_responses(
        check_directory_is_allowed.responses,
        check_configuration_exists.responses,
        check_filepath_is_directly_relative.responses,
        {
            404: {'description': 'Source file does not exist'},
            409: {'description': 'Destination file already exists'},
            500: {'description': 'File cannot be copied due to OS error'},
        },
    ),
)
async def copy_generator_file(
    name: Annotated[
        str,
        CheckDirectoryIsAllowedDep,
        CheckConfigurationExistsDep,
    ],
    source: Path,
    destination: Path,
    settings: SettingsDep,
) -> None:
    # Checks performed here to avoid mixing `Query` and `Depends` in signature
    source = check_filepath_is_directly_relative(source)
    destination = check_filepath_is_directly_relative(destination)

    source = (settings.path.generators_dir / name / source).resolve()
    destination = (settings.path.generators_dir / name / destination).resolve()

    if not source.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Source file does not exist',
        )

    if destination.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Destination file already exists',
        )

    if source == destination:
        return

    loop = asyncio.get_running_loop()
    try:
        if source.is_file():
            await loop.run_in_executor(
                executor=None,
                func=lambda: shutil.copyfile(src=source, dst=destination),
            )
        else:
            await loop.run_in_executor(
                executor=None,
                func=lambda: shutil.copytree(src=source, dst=destination),
            )
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'File cannot be copied due to OS error: {e}',
        ) from None
