"""Generation parameters used across all generators."""

from typing import Self

from pydantic import BaseModel, Field, field_validator, model_validator
from pytz import all_timezones_set


class BatchParameters(BaseModel, extra='forbid', frozen=True):
    """Batcher parameters.

    Attributes
    ----------
    size : int | None, default=10000
        Batch size for generating events.

    delay : float | None, default=1.0
        Batch delay (in seconds) for generating events.

    Notes
    -----
    At least one parameter must be not `None`.

    """

    size: int | None = Field(default=10_000, ge=1)
    delay: float | None = Field(default=1.0, ge=0.1)

    @model_validator(mode='after')
    def validate_batch_params(self) -> Self:  # noqa: D102
        if self.size is None and self.delay is None:
            msg = 'Batch size or timeout must be provided'
            raise ValueError(msg)

        return self


class QueueParameters(BaseModel, extra='forbid', frozen=True):
    """Parameters of input plugins queue.

    Attributes
    ----------
    max_batches : int, default=10
        Maximum number of batches in queue.

    """

    max_batches: int = Field(default=10, ge=1)


class GenerationParameters(BaseModel, extra='forbid', frozen=True):
    """Generation parameters that are common for all generators and can
    be overridden from generator parameters level.

    Attributes
    ----------
    timezone : str, default='UTC'
        Time zone for generating timestamps.

    batch : BatchParameters, default=BatchParameters(...)
        Batch parameters.

    queue : QueueParameters, default=QueueParameters(...)
        Queue parameters.

    keep_order : bool, default=False
        Whether to keep chronological order of timestamps by disabling
        output plugins concurrency.

    max_concurrency : int, default=100
        Maximum number of concurrent write operations performed by
        output plugins.

    """

    timezone: str = Field(default='UTC', min_length=3)
    batch: BatchParameters = Field(default_factory=BatchParameters)
    queue: QueueParameters = Field(default_factory=QueueParameters)
    keep_order: bool = Field(default=False)
    max_concurrency: int = Field(default=100)

    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v: str) -> str:  # noqa: D102
        if v in all_timezones_set:
            return v

        msg = f'Unknown time zone `{v}`'
        raise ValueError(msg)
