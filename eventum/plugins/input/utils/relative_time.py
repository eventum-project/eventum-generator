"""Parser of relative time expressions."""

import re
from datetime import timedelta


def parse_relative_time(expression: str) -> timedelta:
    """Parse expression representing relative time and return
    corresponding timedelta object.

    Parameters
    ----------
    expression : str
        Expression in the following format:
        ```
        <expression> ::= [<sign>]<term>{<term>}...
        <sign> ::= '+' | '-'
        <term> ::= <value><unit>
        <value> ::= <integer>
        <unit> ::= 'd' | 'h' | 'm' | 's'
        ```
        Example expressions: `+1d12h`; `1h30m10s`; `-3d4h`; `-1d2h30m`.

    Returns
    -------
    timedelta
        Parsed expression represented as timedelta object.

    Raises
    ------
    ValueError
        If expression cannot be parsed due to invalid format.

    """
    expression = expression.strip()

    if not expression:
        msg = 'Empty expression is provided'
        raise ValueError(msg)

    pattern = (
        r'^(?P<sign>[-+])?'
        r'(?:(?P<days>\d+)d)?'
        r'(?:(?P<hours>\d+)h)?'
        r'(?:(?P<minutes>\d+)m)?'
        r'(?:(?P<seconds>\d+)s)?$'
    )
    match = re.match(pattern, expression)

    if match is None or match.start() != 0 or match.end() != (len(expression)):
        msg = 'Failed to parse expression'
        raise ValueError(msg)

    groups = match.groupdict()

    match groups.pop('sign'):
        case None:
            sign = 1
        case '+':
            sign = 1
        case '-':
            sign = -1
        case char:
            msg = f'Unexpected sign `{char}`'
            raise ValueError(msg)

    return timedelta(
        **{
            unit: int(value) * sign
            for unit, value in groups.items()
            if value is not None
        },
    )
