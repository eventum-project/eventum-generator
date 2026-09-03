"""Integration tests for the otlp output plugin.

Validates roundtrip delivery, typed attribute preservation, resource
grouping, and oversized-batch splitting against a real OpenTelemetry
Collector, plus a full CLI run into it.
"""

import asyncio
import json
import subprocess
from pathlib import Path

import pytest

from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.otlp.plugin import OtlpOutputPlugin
from tests.integration.event_factory import EventSize
from tests.integration.verification import EventVerifier

pytestmark = pytest.mark.integration

REPO_ROOT = Path(__file__).resolve().parents[2]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _attr_map(attributes: list[dict]) -> dict[str, dict]:
    """Map an OTLP/JSON attribute list to key -> raw `AnyValue` dict."""
    return {kv['key']: kv['value'] for kv in attributes}


def _any_value_kind(value: dict) -> str:
    """Return which `AnyValue` oneof field is populated in `value`."""
    for key in (
        'stringValue',
        'boolValue',
        'intValue',
        'doubleValue',
        'arrayValue',
        'kvlistValue',
        'bytesValue',
    ):
        if key in value:
            return key
    return ''


def _body_event(record: dict) -> dict:
    """Parse the JSON body of a record back into its source event."""
    return json.loads(record.get('body', {}).get('stringValue', '{}'))


async def _write_and_verify(
    plugin,
    collector_consumer,
    events,
    event_factory,
    *,
    timeout: float = 20,
):
    """Write events through the plugin and verify roundtrip integrity."""
    raw = [e.raw_json for e in events]
    written = await plugin.write(raw)
    assert written == len(events), (
        f'Expected {len(events)} written, got {written}'
    )

    await collector_consumer.wait_for_count(len(events), timeout=timeout)
    consumed = await collector_consumer.consume_all()

    verifier = EventVerifier(
        expected_batch_id=event_factory.batch_id,
        expected_count=len(events),
    )
    return verifier.verify(consumed)


# ---------------------------------------------------------------------------
# Roundtrip
# ---------------------------------------------------------------------------


class TestRoundtrip:
    """Verify events survive delivery to a real collector intact."""

    async def test_http_protobuf_roundtrip(
        self,
        otlp_plugin,
        collector_consumer,
        event_factory,
    ):
        """50 events over the default http/protobuf wire survive intact."""
        events = event_factory.create_batch(50, EventSize.MEDIUM)

        result = await _write_and_verify(
            otlp_plugin,
            collector_consumer,
            events,
            event_factory,
        )
        assert result.is_perfect, (
            f'http/protobuf roundtrip failed:\n{result.summary()}'
        )

    async def test_http_json_roundtrip(
        self,
        otlp_endpoint,
        collector_consumer,
        event_factory,
    ):
        """The same roundtrip over http/json, including partial-success
        parsing on the response path, survives intact.
        """
        config = OtlpOutputPluginConfig(
            endpoint=otlp_endpoint,  # type: ignore[arg-type]
            protocol='http/json',
        )
        plugin = OtlpOutputPlugin(
            config=config,
            params={'id': 1, 'generator_id': 'otlp-json-it'},
        )
        await plugin.open()
        try:
            events = event_factory.create_batch(50, EventSize.MEDIUM)
            result = await _write_and_verify(
                plugin,
                collector_consumer,
                events,
                event_factory,
            )
        finally:
            await plugin.close()

        assert result.is_perfect, (
            f'http/json roundtrip failed:\n{result.summary()}'
        )

    async def test_batch_over_max_request_bytes_arrives_complete(
        self,
        otlp_plugin,
        collector_consumer,
        event_factory,
    ):
        """A batch exceeding the default request budget still arrives
        complete, split across several requests rather than dropped.
        """
        events = event_factory.create_batch(120, EventSize.LARGE)
        total_bytes = sum(len(e.raw_json.encode()) for e in events)
        assert (
            total_bytes
            > OtlpOutputPluginConfig.model_fields['max_request_bytes'].default
        ), 'batch must exceed the default request budget'

        result = await _write_and_verify(
            otlp_plugin,
            collector_consumer,
            events,
            event_factory,
            timeout=60,
        )
        assert result.total_received == 120, (
            f'Expected 120 records to arrive, got {result.total_received}'
        )
        assert result.is_perfect, (
            f'Oversized batch delivery failed:\n{result.summary()}'
        )


# ---------------------------------------------------------------------------
# Typed attributes and resources
# ---------------------------------------------------------------------------


class TestMapping:
    """Verify the OTLP shape the collector actually stored, not just
    that the plugin reported success.
    """

    async def test_typed_attributes_survive(
        self,
        otlp_plugin,
        collector_consumer,
        event_factory,
    ):
        """A nested object, an int and an array keep their OTLP types."""
        extra_fields = {
            'host': {'name': 'typed-attrs-host'},
            'custom_count': 7,
            'custom_tags': ['alpha', 'beta', 'gamma'],
        }
        event = event_factory.create(
            EventSize.SMALL, extra_fields=extra_fields
        )

        written = await otlp_plugin.write([event.raw_json])
        assert written == 1

        await collector_consumer.wait_for_count(1, timeout=15)
        records = await collector_consumer.consume_records()

        match = next(
            (
                record
                for _, record in records
                if _body_event(record).get('_test', {}).get('sequence_id')
                == event.sequence_id
                and _body_event(record).get('_test', {}).get('batch_id')
                == event_factory.batch_id
            ),
            None,
        )
        assert match is not None, 'Event was not found among consumed records'

        attributes = _attr_map(match['attributes'])

        assert attributes['host.name']['stringValue'] == 'typed-attrs-host'

        assert _any_value_kind(attributes['custom_count']) == 'intValue'
        assert int(attributes['custom_count']['intValue']) == 7

        assert _any_value_kind(attributes['custom_tags']) == 'arrayValue'
        array_values = attributes['custom_tags']['arrayValue']['values']
        assert [v['stringValue'] for v in array_values] == [
            'alpha',
            'beta',
            'gamma',
        ]

    async def test_resource_attributes_group_by_lifted_field(
        self,
        otlp_endpoint,
        collector_consumer,
        event_factory,
    ):
        """Two events with a different lifted field land in two
        resources, each still carrying the generator's `service.name`.
        """
        config = OtlpOutputPluginConfig(
            endpoint=otlp_endpoint,  # type: ignore[arg-type]
            resource_attributes_from={'host.name': 'host.name'},
        )
        plugin = OtlpOutputPlugin(
            config=config,
            params={'id': 1, 'generator_id': 'otlp-resource-it'},
        )
        await plugin.open()
        try:
            event_a = event_factory.create(
                EventSize.SMALL,
                extra_fields={'host': {'name': 'resource-host-a'}},
            )
            event_b = event_factory.create(
                EventSize.SMALL,
                extra_fields={'host': {'name': 'resource-host-b'}},
            )
            written = await plugin.write(
                [event_a.raw_json, event_b.raw_json],
            )
            assert written == 2

            await collector_consumer.wait_for_count(2, timeout=15)
            records = await collector_consumer.consume_records()
        finally:
            await plugin.close()

        resources_by_host: dict[str, dict] = {}
        for resource, _record in records:
            attrs = _attr_map(resource.get('attributes', []))
            if 'host.name' not in attrs:
                continue
            resources_by_host[attrs['host.name']['stringValue']] = attrs

        assert set(resources_by_host) == {
            'resource-host-a',
            'resource-host-b',
        }, 'Expected exactly two distinct resources, one per host name'

        for attrs in resources_by_host.values():
            assert attrs['service.name']['stringValue'] == 'otlp-resource-it'


# ---------------------------------------------------------------------------
# CLI end-to-end
# ---------------------------------------------------------------------------


_TEMPLATE_BODY = (
    '{"@timestamp": "{{ timestamp.isoformat() }}", '
    '"message": "otlp cli e2e", '
    '"host": {"name": "cli-host"}}'
)


def _write_generator_project(
    project_dir: Path,
    *,
    endpoint: str,
    count: int,
) -> Path:
    """Write a self-contained generator project into `project_dir`.

    Uses a `timer` input bounded by `repeat: 1` so the run terminates,
    a `template` event plugin rendering a small ECS event, and the
    `otlp` output pointed at `endpoint`.
    """
    templates_dir = project_dir / 'templates'
    templates_dir.mkdir()
    (templates_dir / 'event.json.jinja').write_text(_TEMPLATE_BODY)

    generator_path = project_dir / 'generator.yml'
    generator_path.write_text(
        'input:\n'
        '  - timer:\n'
        '      seconds: 0.1\n'
        f'      count: {count}\n'
        '      repeat: 1\n'
        '\n'
        'event:\n'
        '  template:\n'
        '    mode: all\n'
        '    templates:\n'
        '      - event:\n'
        '          template: templates/event.json.jinja\n'
        '\n'
        'output:\n'
        '  - otlp:\n'
        f'      endpoint: "{endpoint}"\n',
    )
    return generator_path


class TestCliGenerate:
    """Verify a real CLI run reaches the collector, not just the plugin
    called directly from a test process.
    """

    @pytest.mark.e2e
    async def test_generate_writes_expected_records(
        self,
        tmp_path,
        otlp_endpoint,
        collector_consumer,
    ):
        """A real `eventum generate` subprocess reaches the collector."""
        generator_id = 'otlp-e2e'
        count = 5
        generator_path = _write_generator_project(
            tmp_path,
            endpoint=otlp_endpoint,
            count=count,
        )

        result = await asyncio.to_thread(
            subprocess.run,
            [
                'uv',
                'run',
                'eventum',
                'generate',
                '--path',
                str(generator_path),
                '--id',
                generator_id,
                '--live-mode',
                'false',
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, (
            f'CLI run failed:\nstdout={result.stdout}\nstderr={result.stderr}'
        )

        await collector_consumer.wait_for_count(count, timeout=15)
        records = await collector_consumer.consume_records()

        assert len(records) == count, (
            f'Expected {count} records from the CLI run, got {len(records)}'
        )

        service_names = {
            _attr_map(resource.get('attributes', []))
            .get('service.name', {})
            .get('stringValue')
            for resource, _record in records
        }
        assert service_names == {generator_id}, (
            f'Expected every record to carry service.name={generator_id!r}'
            f', got {service_names!r}'
        )
