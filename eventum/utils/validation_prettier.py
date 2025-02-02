from typing import Iterable

from pydantic_core import ErrorDetails


def prettify_validation_errors(
    errors: Iterable[ErrorDetails],
    sep: str = '; '
) -> str:
    """Prettify pydantic validation errors gotten from
    `e.errors()` to user-friendly description string.

    Parameters
    ----------
    errors : Iterable[ErrorDetails]
        Iterable of error details

    sep : str, default='; '
        Separator for errors message

    Returns
    -------
    str
        User-friendly description of errors
    """

    def _loc(location: Iterable[str | int]) -> str:
        return '.'.join(
            loc if isinstance(loc, str) else f'[{loc}]'
            for loc in location
        )

    messages: list[str] = []

    for error in errors:
        loc = error['loc']
        input = error['input']
        msg = error['msg']
        type = error['type']

        messages.append(
            f'"{_loc(loc)}": {input!r} - {msg.lower()} ({type})'
        )

    return sep.join(messages)
