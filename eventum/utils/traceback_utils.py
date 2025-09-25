"""Module for working with tracebacks."""

import traceback
from typing import Literal, assert_never


def shorten_traceback(
    e: Exception,
    key_phrase: str,
    start_position: Literal['at', 'after'] = 'at',
) -> str:
    """Return a shortened traceback string starting from the given key phrase.

    Parameters
    ----------
    e : Exception
        Exception to extract traceback from.

    key_phrase : str
        Key phrase.

    start_position : Literal['at', 'after']
        Start position of shortened traceback relative to key phrase line:
            - `at`: start from the line with the key phrase
            - `after`: start from the next line after the key phrase

    Returns
    -------
    str
        Shortened formatted traceback.

    Notes
    -----
    If key phrase is not found in traceback, then full formatted
    traceback returned as is.

    """
    tb_lines = traceback.format_exception(e)
    index = 0
    for i, line in enumerate(tb_lines):
        if key_phrase in line:
            index = i
            break

    match start_position:
        case 'at':
            pass
        case 'after':
            index += 1
        case p:
            assert_never(p)

    return '\n'.join(tb_lines[index:])
