"""Utils for response descriptions."""

from collections.abc import Callable
from typing import Any, ParamSpec, Protocol, TypeVar, cast

type ResponsesInfo = dict[int | str, dict[str, Any]]

_P = ParamSpec('_P')
_R_co = TypeVar('_R_co', covariant=True)


class _CallableWithResponses(Protocol[_P, _R_co]):
    responses: ResponsesInfo

    def __call__(self, *args: _P.args, **kwargs: _P.kwargs) -> _R_co: ...


def set_responses(
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


def merge_responses(*responses: ResponsesInfo) -> ResponsesInfo:
    """Merge multiple FastAPI-style `responses` dictionaries into one.

    This function combines response metadata dictionaries keyed by
    status codes. If the same status code appears in multiple inputs,
    their `description` fields are concatenated into a single string,
    each prefixed with a dash and separated by newlines.

    Parameters
    ----------
    *responses : ResponsesInfo
        One or more mappings of HTTP status codes (or strings) to
        metadata dictionaries, typically used for FastAPI route
        `responses` parameter.

    Returns
    -------
    ResponsesInfo
        A new merged mapping of status codes to metadata dictionaries,
        with descriptions combined when conflicts occur.

    Notes
    -----
    Metadata other than description is taken only from first element
    once.

    """
    merged_responses: ResponsesInfo = {}

    for resp in responses:
        for code, item_info in resp.items():
            info = merged_responses.get(code, None)

            if info is None:
                new_info = dict(item_info)

                if 'description' in new_info:
                    new_info['description'] = f'- {new_info["description"]}\n'

                merged_responses[code] = new_info
            elif 'description' in item_info:
                if 'description' in info:
                    info['description'] += f'- {item_info["description"]}\n'
                else:
                    info['description'] = f'- {item_info["description"]}\n'

    return merged_responses
