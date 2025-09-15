"""Generator configs router dependencies."""

from pathlib import Path
from typing import Annotated

from fastapi import Depends, HTTPException, status

from eventum.api.dependencies.app import SettingsDep
from eventum.api.utils.response_description import set_responses


def _get_generator_configuration_file_name() -> str:
    """Get generator configuration file name.

    Returns
    -------
    str
        File name.

    """
    return 'generator.yml'


GeneratorConfigurationFileNameDep = Annotated[
    str,
    Depends(_get_generator_configuration_file_name),
]


@set_responses(
    responses={
        403: {
            'description': (
                'Accessing directories outside `path.generators_dir` '
                'is not allowed'
            ),
        },
    },
)
def check_directory_is_allowed(
    name: str,
    settings: SettingsDep,
) -> str:
    """Check that a generator directory is located within the
    allowed generators directory.

    Parameters
    ----------
    name : str
        Name of the generator directory to check.

    settings : SettingsDep
        Application settings dependency.

    Returns
    -------
    str
        Original directory name.

    Raises
    ------
    HTTPException
        If the resolved path is outside `settings.path.generators_dir`.

    """
    path = (settings.path.generators_dir / name).resolve()

    if not path.is_relative_to(settings.path.generators_dir):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                'Accessing directories outside `path.generators_dir` '
                'is not allowed'
            ),
        )

    return name


CheckDirectoryIsAllowedDep = Annotated[
    str,
    Depends(check_directory_is_allowed),
]


@set_responses(
    responses={
        404: {
            'description': 'Generator configuration does not exist',
        },
    },
)
def check_configuration_exists(
    name: str,
    settings: SettingsDep,
    config_file_name: GeneratorConfigurationFileNameDep,
) -> str:
    """Check that generator configuration exist.

    Parameters
    ----------
    name : str
        Name of the generator directory to check.

    settings : SettingsDep
        Application settings dependency.

    config_file_name : GeneratorConfigurationFileNameDep
        Generator configuration file name dependency.

    Returns
    -------
    str
        Original directory name.

    Raises
    ------
    HTTPException
        Generator configuration do not exist.

    """
    path = (settings.path.generators_dir / name / config_file_name).resolve()

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Generator configuration does not exist',
        )

    return name


CheckConfigurationExistsDep = Annotated[
    str,
    Depends(check_configuration_exists),
]


@set_responses(
    responses={
        409: {
            'description': 'Configuration already exists',
        },
    },
)
def check_configuration_not_exists(
    name: str,
    settings: SettingsDep,
    config_file_name: GeneratorConfigurationFileNameDep,
) -> str:
    """Check that generator configuration does not exist.

    Parameters
    ----------
    name : str
        Name of the generator directory to check.

    settings : SettingsDep
        Application settings dependency.

    config_file_name : GeneratorConfigurationFileNameDep
        Generator configuration file name dependency.

    Returns
    -------
    str
        Original directory name.

    Raises
    ------
    HTTPException
        Configuration already exists.

    """
    path = (settings.path.generators_dir / name / config_file_name).resolve()

    if path.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Configuration already exists',
        )

    return name


CheckConfigurationNotExistsDep = Annotated[
    str,
    Depends(check_configuration_not_exists),
]


@set_responses(
    responses={
        400: {
            'description': (
                "Parent directories traversal (i.e. using '..') "
                'is not allowed and path cannot be absolute'
            ),
        },
    },
)
def check_filepath_is_directly_relative(
    filepath: Path,
) -> Path:
    """Check that filepath directly relative (i.e. not using '..').

    Parameters
    ----------
    filepath : Path
        Path to check.

    Returns
    -------
    Path
        Original path.

    Raises
    ------
    HTTPException
        - Parent directories traversal (i.e. using '..') is not allowed
        - Path cannot be absolute

    """
    if filepath.is_absolute():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Path cannot be absolute',
        )

    if any(part == '..' for part in filepath.parts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Parent directories traversal (i.e. using '..') "
                'is not allowed.'
            ),
        )

    return filepath


CheckFilepathIsDirectlyRelativeDep = Annotated[
    Path,
    Depends(check_filepath_is_directly_relative),
]
