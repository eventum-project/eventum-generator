"""Dependencies of generator configs router."""

from collections.abc import Callable
from pathlib import Path
from typing import Annotated, Any, ParamSpec, Protocol, TypeVar, cast

from fastapi import Depends, HTTPException, status

from eventum.api.dependencies import SettingsDep

type ResponsesInfo = dict[int | str, dict[str, Any]]

_P = ParamSpec('_P')
_R_co = TypeVar('_R_co', covariant=True)


class _CallableWithResponses(Protocol[_P, _R_co]):
    responses: ResponsesInfo

    def __call__(self, *args: _P.args, **kwargs: _P.kwargs) -> _R_co: ...


def _set_responses(
    responses: ResponsesInfo,
) -> Callable[[Callable[_P, _R_co]], _CallableWithResponses[_P, _R_co]]:
    """Set `responses` attribute to a function for FastAPI route
    metadata.

    This is primarily used with FastAPI route functions to provide
    the `responses` parameter metadata, which describes possible
    HTTP responses for the route.

    Parameters
    ----------
    responses : ResponsesInfo
        A mapping of HTTP status codes (or strings) to metadata
        dictionaries.

    Returns
    -------
    Callable[[Callable[_P, _R_co]], _CallableWithResponses[_P, _R_co]]
        Decorator that attaches `.responses` to the input function.

    """

    def wrapper(f: Callable[_P, _R_co]) -> _CallableWithResponses[_P, _R_co]:
        f = cast('_CallableWithResponses[_P, _R_co]', f)
        f.responses = responses
        return f

    return wrapper


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


@_set_responses(
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


@_set_responses(
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


@_set_responses(
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


@_set_responses(
    responses={
        400: {
            'description': (
                "- Parent directories traversal (i.e. using '..') "
                'is not allowed\n'
                '- Path cannot be absolute'
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
