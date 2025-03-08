"""Exceptions used across all subpackages."""

from typing import Any


class ContextualError(Exception):
    """Error with context."""

    def __init__(self, *args: object, context: dict[str, Any]) -> None:
        """Initialize contextual error.

        Parameters
        ----------
        *args: object
            Exception arguments

        context : dict[str, Any]
            Context of error

        """
        super().__init__(*args)

        self.context = context
