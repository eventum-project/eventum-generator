"""Field definitions used in input plugin configs."""

from datetime import datetime
from enum import StrEnum
from typing import Annotated

import dateparser
from pydantic import AfterValidator

from eventum.plugins.input.relative_time import parse_relative_time


def _try_parse_human_datetime(v: str) -> str:
    if dateparser.parse(v) is None:
        msg = f'Not valid datetime expression "{v}"'
        raise ValueError(msg)

    return v


HumanDatetimeString = Annotated[str, AfterValidator(_try_parse_human_datetime)]


def _try_parse_relative_time(v: str) -> str:
    try:
        parse_relative_time(v)
    except ValueError:
        msg = f'Not valid relative time expression "{v}"'
        raise ValueError(msg) from None
    else:
        return v


RelativeTimeString = Annotated[str, AfterValidator(_try_parse_relative_time)]


class TimeKeyword(StrEnum):
    """Time keyword representing some point in time."""

    NOW = 'now'
    NEVER = 'never'


def _try_parse_time_keyword(v: str) -> str:
    try:
        TimeKeyword(v)
    except ValueError:
        msg = f'Not valid time keyword "{v}"'
        raise ValueError(msg) from None
    else:
        return v


TimeKeywordString = Annotated[str, AfterValidator(_try_parse_time_keyword)]


# For proper validation in pydantic models this annotation should be used
# with union_mode='left_to_right' in Field
type VersatileDatetimeStrict = (
    datetime | TimeKeywordString | RelativeTimeString | HumanDatetimeString
)
type VersatileDatetime = VersatileDatetimeStrict | None
