"""Custom operators for FSM condition checks."""

from collections.abc import Sequence


def len_eq(a: Sequence, b: int) -> bool:
    """Same as len(a) == b."""  # noqa: D401
    return len(a) == b


def len_gt(a: Sequence, b: int) -> bool:
    """Same as len(a) > b."""  # noqa: D401
    return len(a) > b


def len_ge(a: Sequence, b: int) -> bool:
    """Same as len(a) >= b."""  # noqa: D401
    return len(a) >= b


def len_lt(a: Sequence, b: int) -> bool:
    """Same as len(a) < b."""  # noqa: D401
    return len(a) < b


def len_le(a: Sequence, b: int) -> bool:
    """Same as len(a) <= b."""  # noqa: D401
    return len(a) <= b
