"""Router models."""

from pydantic import BaseModel


class GeneratorStatus(BaseModel, frozen=True, extra='forbid'):
    """Status of generator.

    Attributes
    ----------
    is_initializing : bool
        Whether the generator is initializing.

    is_running : bool
        Whether the generator is running.

    is_ended_up : bool
        Whether the generator has ended execution with or without
        errors.

    is_ended_up_successfully : bool
        Whether the generator has ended execution successfully.

    """

    is_initializing: bool
    is_running: bool
    is_ended_up: bool
    is_ended_up_successfully: bool
