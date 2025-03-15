"""Exceptions used across output plugins."""


class FormatError(Exception):
    """Exception for formatting errors."""

    def __init__(
        self,
        *args: object,
        original_event: str | None = None,
    ) -> None:
        """Initialize error.

        Parameters
        ----------
        *args: object
            Exceptions arguments

        original_event : str | None, default=NOne
            Original event

        """
        super().__init__(*args)
        self.original_event = original_event
