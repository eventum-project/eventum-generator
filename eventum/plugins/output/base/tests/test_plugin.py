import asyncio
from collections.abc import Sequence
from typing import override

import pytest
import structlog

from eventum.plugins.output.base.config import (
    FormatterConfigT,
    OutputPluginConfig,
)
from eventum.plugins.output.base.plugin import OutputPlugin, OutputPluginParams
from eventum.plugins.output.exceptions import (
    FormatError,
    FormatErrorKind,
    PluginWriteError,
)
from eventum.plugins.output.fields import (
    Format,
    JsonFormatterConfig,
    TemplateFormatterConfig,
)
from eventum.plugins.output.formatters import FormattingResult
from eventum.plugins.output.syslog import SyslogFormatterConfig


class DummyOutputPluginConfig(OutputPluginConfig, frozen=True):
    """Config of dummy output plugin."""


class DummyOutputPlugin(
    OutputPlugin[DummyOutputPluginConfig, OutputPluginParams],
    register=False,
):
    """Output plugin that keeps written events in memory.

    Parameters
    ----------
    written : int | None, default=None
        Number of events to report as written, all provided events are
        reported as written if not specified.

    error : Exception | None, default=None
        Error to raise instead of writing events.

    """

    @override
    def __init__(
        self,
        config: DummyOutputPluginConfig,
        params: OutputPluginParams,
        written: int | None = None,
        error: Exception | None = None,
    ) -> None:
        super().__init__(config, params)

        self.written_events: list[str] = []

        self._reported_written = written
        self._error = error

    @override
    async def _open(self) -> None: ...

    @override
    async def _close(self) -> None: ...

    @override
    async def _write(self, events: Sequence[str]) -> int:
        if self._error is not None:
            raise self._error

        self.written_events.extend(events)

        if self._reported_written is None:
            return len(events)

        return self._reported_written


def create_plugin(
    formatter_config: FormatterConfigT,
    written: int | None = None,
    error: Exception | None = None,
) -> DummyOutputPlugin:
    return DummyOutputPlugin(
        config=DummyOutputPluginConfig(formatter=formatter_config),
        params={'id': 1},
        written=written,
        error=error,
    )


@pytest.mark.asyncio
async def test_format_failed_counts_rejected_events():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    await plugin.open()
    written = await plugin.write(['{"a": 1}', 'not a json', '{"b": 2}'])
    await plugin.close()

    assert written == 2
    assert plugin.written == 2
    assert plugin.format_failed == 1
    assert plugin.write_failed == 0
    assert plugin.written_events == ['{"a": 1}', '{"b": 2}']


@pytest.mark.asyncio
async def test_format_failed_is_zero_for_valid_events():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"b": 2}'])
    await plugin.close()

    assert written == 2
    assert plugin.format_failed == 0


@pytest.mark.asyncio
async def test_format_failed_counts_events_of_rejected_batch():
    plugin = create_plugin(
        TemplateFormatterConfig(
            format=Format.TEMPLATE_BATCH,
            template='{{ 1 / 0 }}',
        ),
    )

    await plugin.open()
    written = await plugin.write(['event1', 'event2', 'event3'])
    await plugin.close()

    assert written == 0
    assert plugin.written == 0
    assert plugin.format_failed == 3
    assert plugin.written_events == []


@pytest.mark.asyncio
async def test_nothing_is_written_when_all_aggregated_events_rejected():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON_BATCH))

    await plugin.open()
    written = await plugin.write(['not a json', 'also not a json'])
    await plugin.close()

    assert written == 0
    assert plugin.format_failed == 2
    assert plugin.written_events == []


@pytest.mark.asyncio
async def test_format_failed_counts_all_events_on_formatter_error():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    def raise_error(_events: Sequence[str]) -> None:
        msg = 'Formatter is broken'
        raise RuntimeError(msg)

    plugin._formatter.format_events = raise_error

    await plugin.open()

    with pytest.raises(RuntimeError):
        await plugin.write(['{"a": 1}', '{"b": 2}'])

    await plugin.close()

    assert plugin.format_failed == 2
    assert plugin.written == 0


@pytest.mark.asyncio
async def test_format_failed_is_reset_on_open():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    await plugin.open()
    await plugin.write(['not a json'])
    await plugin.close()

    assert plugin.format_failed == 1

    await plugin.open()

    assert plugin.format_failed == 0


@pytest.mark.asyncio
async def test_syslog_missing_field_logs_one_event_and_count():
    plugin = create_plugin(
        SyslogFormatterConfig(
            format=Format.SYSLOG,
            message_field='missing',
        ),
    )
    events = ['{"message":"first"}', '{"message":"second"}']

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await plugin.write(events)

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 1
    assert errors[0]['reason'] == 'Event does not carry field `missing`'
    assert errors[0]['count'] == 2
    assert errors[0]['original_event'] == events[0]


@pytest.mark.asyncio
async def test_syslog_header_failures_are_separated_by_source():
    plugin = create_plugin(
        SyslogFormatterConfig(
            format=Format.SYSLOG,
            hostname={'field': 'host'},
            app_name={'field': 'app'},
        ),
    )
    events = [
        '{"host":"bad\\n","app":"valid"}',
        '{"host":"valid","app":"bad\\n"}',
    ]

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await plugin.write(events)

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 2
    assert errors[0]['reason'].startswith('Field `host`')
    assert errors[0]['original_event'] == events[0]
    assert errors[1]['reason'].startswith('Field `app`')
    assert errors[1]['original_event'] == events[1]


@pytest.mark.asyncio
async def test_same_format_errors_are_reported_once_per_period():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))
    error_key = (Format.JSON, FormatErrorKind.JSON_DECODE, None)

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await plugin.write(['{}x', '{} x', '{}  x'])

        throttler = plugin._format_error_throttlers[error_key]
        assert throttler._period == 10.0

        await plugin.write(['not json'] * 2)

        throttler._moments[0] -= throttler._period
        await plugin.write(['not json'] * 4)

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 2
    assert errors[0]['event'] == 'Failed to format event'
    assert errors[0]['format'] == Format.JSON
    assert errors[0]['count'] == 3
    assert errors[0]['original_event'] == '{}x'
    assert errors[1]['event'] == 'Failed to format event'
    assert errors[1]['format'] == Format.JSON
    assert errors[1]['reason'] == 'Event is not valid JSON'
    assert errors[1]['count'] == 9
    assert 'original_event' not in errors[1]
    assert len(plugin._format_error_counts) == 1
    assert len(plugin._format_error_throttlers) == 1
    assert len(plugin._format_error_reasons) == 1
    assert len(plugin._format_error_reported_counts) == 1


@pytest.mark.asyncio
async def test_different_format_errors_are_reported_separately():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    def reject_events(_events: Sequence[str]) -> FormattingResult:
        return FormattingResult(
            events=[],
            formatted_count=0,
            errors=[
                FormatError(
                    'First reason',
                    original_event='event 1',
                    source='first',
                ),
                FormatError(
                    'Second reason',
                    original_event='event 2',
                    source='second',
                ),
                FormatError(
                    'Updated first reason',
                    original_event='event 3',
                    source='first',
                ),
            ],
        )

    plugin._formatter.format_events = reject_events

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await plugin.write(['event 1', 'event 2', 'event 3'])

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 2
    assert errors[0]['reason'] == 'First reason'
    assert errors[0]['count'] == 2
    assert errors[0]['original_event'] == 'event 1'
    assert errors[1]['reason'] == 'Second reason'
    assert errors[1]['count'] == 1
    assert errors[1]['original_event'] == 'event 2'


@pytest.mark.asyncio
async def test_format_error_without_original_event_is_reported():
    plugin = create_plugin(
        TemplateFormatterConfig(
            format=Format.TEMPLATE_BATCH,
            template='{{ 1 / 0 }}',
        ),
    )

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await plugin.write(['event 1', 'event 2'])

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 1
    assert errors[0]['reason'] == (
        'Failed render template: ZeroDivisionError: division by zero'
    )
    assert errors[0]['count'] == 2
    assert 'original_event' not in errors[0]


@pytest.mark.asyncio
async def test_pending_format_error_count_is_reported_on_close():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await plugin.write(['first invalid event'])
        await plugin.write(['second invalid event', 'third invalid event'])
        await plugin.close()

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 2
    assert errors[1]['event'] == 'Failed to format event'
    assert errors[1]['format'] == Format.JSON
    assert errors[1]['reason'] == 'Event is not valid JSON'
    assert errors[1]['count'] == 3
    assert 'original_event' not in errors[1]


@pytest.mark.asyncio
async def test_pending_format_error_count_is_reported_when_close_fails(
    monkeypatch: pytest.MonkeyPatch,
):
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    async def fail_close() -> None:
        raise RuntimeError('close failed')

    await plugin.open()
    monkeypatch.setattr(plugin, '_close', fail_close)

    with structlog.testing.capture_logs() as logs:
        await plugin.write(['first invalid event'])
        await plugin.write(['second invalid event', 'third invalid event'])

        with pytest.raises(RuntimeError, match='close failed'):
            await plugin.close()

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 2
    assert errors[1]['count'] == 3
    assert 'original_event' not in errors[1]


@pytest.mark.asyncio
async def test_format_error_reporting_is_reset_on_open():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await plugin.write(['first invalid event'])
        await plugin.close()
        await plugin.open()
        await plugin.write(['second invalid event'])

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 2
    assert errors[0]['count'] == 1
    assert errors[0]['original_event'] == 'first invalid event'
    assert errors[1]['count'] == 1
    assert errors[1]['original_event'] == 'second invalid event'


@pytest.mark.asyncio
async def test_concurrent_format_errors_are_throttled():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    await plugin.open()

    with structlog.testing.capture_logs() as logs:
        await asyncio.gather(
            plugin.write(['not json']),
            plugin.write(['not json']),
        )

    errors = [entry for entry in logs if entry['log_level'] == 'error']

    assert len(errors) == 1
    assert plugin.format_failed == 2


@pytest.mark.asyncio
async def test_concurrent_format_error_reports_are_serialized():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))
    error_key = (Format.JSON, FormatErrorKind.JSON_DECODE, None)
    first_started = asyncio.Event()
    release_first = asyncio.Event()
    records: list[dict[str, object]] = []

    class BlockingLogger:
        async def aerror(self, event: str, **context: object) -> None:
            records.append({'event': event, **context})

            if len(records) == 1:
                first_started.set()
                await release_first.wait()

    await plugin.open()
    plugin._logger = BlockingLogger()

    first_write = asyncio.create_task(
        plugin._report_format_errors(
            [
                FormatError(
                    'First detailed reason',
                    original_event='{}x',
                    kind=FormatErrorKind.JSON_DECODE,
                    report_reason='Event is not valid JSON',
                ),
            ],
        ),
    )
    await first_started.wait()
    plugin._format_error_throttlers[error_key]._moments[0] -= 10.0
    second_write = asyncio.create_task(
        plugin._report_format_errors(
            [
                FormatError(
                    'Second detailed reason',
                    original_event='not json',
                    kind=FormatErrorKind.JSON_DECODE,
                    report_reason='Event is not valid JSON',
                ),
            ],
        ),
    )

    async with asyncio.timeout(1.0):
        while plugin._format_error_counts[error_key] != 2:
            await asyncio.sleep(0)

    assert plugin._format_error_counts[error_key] == 2
    assert len(records) == 1

    release_first.set()
    await asyncio.gather(first_write, second_write)

    assert len(records) == 2
    assert records[0]['original_event'] == '{}x'
    assert 'original_event' not in records[1]
    assert plugin._format_error_reported_counts[error_key] == 2


@pytest.mark.asyncio
async def test_write_failed_is_zero_for_written_events():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON))

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"a": 2}', '{"a": 3}'])
    await plugin.close()

    assert written == 3
    assert plugin.written == 3
    assert plugin.write_failed == 0


@pytest.mark.asyncio
async def test_write_failed_counts_unwritten_events():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON), written=2)

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"a": 2}', '{"a": 3}'])
    await plugin.close()

    assert written == 2
    assert plugin.written == 2
    assert plugin.write_failed == 1


@pytest.mark.asyncio
async def test_write_failed_excludes_unformatted_events():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON), written=1)

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"a": 2}', 'not a json'])
    await plugin.close()

    assert written == 1
    assert plugin.written == 1
    assert plugin.format_failed == 1
    assert plugin.write_failed == 1


@pytest.mark.asyncio
async def test_write_failed_counts_all_events_on_write_error():
    plugin = create_plugin(
        JsonFormatterConfig(format=Format.JSON),
        error=PluginWriteError('Plugin is broken', context={}),
    )

    await plugin.open()

    with pytest.raises(PluginWriteError):
        await plugin.write(['{"a": 1}', '{"a": 2}', '{"a": 3}'])

    await plugin.close()

    assert plugin.written == 0
    assert plugin.write_failed == 3


@pytest.mark.asyncio
async def test_write_failed_is_zero_for_written_aggregated_events():
    plugin = create_plugin(
        JsonFormatterConfig(format=Format.JSON_BATCH),
        written=1,
    )

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"a": 2}', '{"a": 3}'])
    await plugin.close()

    assert written == 3
    assert plugin.written == 3
    assert plugin.write_failed == 0


@pytest.mark.asyncio
async def test_write_failed_counts_events_of_unwritten_aggregated_event():
    plugin = create_plugin(
        JsonFormatterConfig(format=Format.JSON_BATCH),
        written=0,
    )

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"a": 2}', '{"a": 3}'])
    await plugin.close()

    assert written == 0
    assert plugin.written == 0
    assert plugin.write_failed == 3


@pytest.mark.asyncio
async def test_write_failed_is_zero_for_excess_written_events():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON), written=5)

    await plugin.open()
    written = await plugin.write(['{"a": 1}', '{"a": 2}', '{"a": 3}'])
    await plugin.close()

    assert written == 5
    assert plugin.write_failed == 0


@pytest.mark.asyncio
async def test_write_failed_is_reset_on_open():
    plugin = create_plugin(JsonFormatterConfig(format=Format.JSON), written=0)

    await plugin.open()
    await plugin.write(['{"a": 1}'])
    await plugin.close()

    assert plugin.write_failed == 1

    await plugin.open()

    assert plugin.write_failed == 0
