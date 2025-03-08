"""Functions to prettify pydantic validation errors."""

from collections.abc import Iterable

from pydantic_core import ErrorDetails


def prettify_validation_errors(
    errors: Iterable[ErrorDetails],
    sep: str = '; ',
) -> str:
    """Prettify pydantic validation errors to user-friendly description
    string.

    Parameters
    ----------
    errors : Iterable[ErrorDetails]
        Iterable of error details

    sep : str, default='; '
        Separator of error messages

    Returns
    -------
    str
        User-friendly description of errors

    """

    def _loc(location: Iterable[str | int]) -> str:
        return '.'.join(
            loc if isinstance(loc, str) else f'[{loc}]' for loc in location
        )

    messages: list[str] = []

    for error in errors:
        loc = error['loc']
        input = error['input']  # noqa: A001
        msg = error['msg']
        type = error['type']  # noqa: A001

        if not loc:
            message = f'{input!r} - {msg.lower()} ({type})'
        else:
            message = f'"{_loc(loc)}": {input!r} - {msg.lower()} ({type})'

        messages.append(message)

    return sep.join(messages)
