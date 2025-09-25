"""Models."""

from abc import ABC
from datetime import datetime

from pydantic import BaseModel, Field, computed_field
from pytz import timezone


class GeneratorStatus(BaseModel, frozen=True, extra='forbid'):
    """Status of generator."""

    is_initializing: bool = Field(
        description='Whether the generator is initializing',
    )
    is_running: bool = Field(description='Whether the generator is running')
    is_ended_up: bool = Field(
        description=(
            'Whether the generator has ended execution with or without errors'
        ),
    )
    is_ended_up_successfully: bool = Field(
        description='Whether the generator has ended execution successfully.',
    )


class PluginStats(BaseModel, ABC, frozen=True, extra='forbid'):
    """Plugin statistics."""

    plugin_name: str = Field(min_length=1, description='Name of the plugin')
    plugin_id: int = Field(ge=0, description='ID of the plugin')


class InputPluginStats(PluginStats, frozen=True, extra='forbid'):
    """Input plugin statistics."""

    generated: int = Field(ge=0, description='Number of generated timestamps')


class EventPluginStats(PluginStats, frozen=True, extra='forbid'):
    """Event plugin statistics."""

    produced: int = Field(ge=0, description='Number of produced events')
    produce_failed: int = Field(
        ge=0,
        description='Number of unsuccessfully produced events',
    )


class OutputPluginStats(PluginStats, frozen=True, extra='forbid'):
    """Output plugin statistics."""

    written: int = Field(ge=0, description='Number of written events')
    write_failed: int = Field(
        ge=0,
        description='Number of unsuccessfully written events',
    )
    format_failed: int = Field(
        ge=0,
        description='Number of unsuccessfully formatted events',
    )


class GeneratorStats(BaseModel, frozen=True, extra='forbid'):
    """Stats of generator."""

    start_time: datetime = Field(description='Start time of the generator')
    input: list[InputPluginStats] = Field(
        description='Input plugins statistics',
    )
    event: EventPluginStats = Field(description='Event plugin statistics')
    output: list[OutputPluginStats] = Field(
        description='Output plugins statistics',
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_generated(self) -> int:
        """Total number of timestamps generated across all input plugins."""
        total = 0
        for plugin in self.input:
            total += plugin.generated

        return total

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_written(self) -> int:
        """Total number of written event across all output plugins."""
        total = 0
        for plugin in self.output:
            total += plugin.written

        return total

    @computed_field  # type: ignore[prop-decorator]
    @property
    def uptime(self) -> float:
        """Number of seconds since generator start time."""
        now = datetime.now().astimezone(tz=timezone('UTC'))
        delta_start = now - self.start_time

        return delta_start.total_seconds()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def input_eps(self) -> float:
        """Average number of events per second for total number
        of generated timestamps since generator start time.
        """
        return self.total_generated / self.uptime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def output_eps(self) -> float:
        """Average number of events per second for total number
        of written events since generator start time.
        """
        return self.total_written / self.uptime
