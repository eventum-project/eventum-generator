import math

from eventum.plugins.output.plugins.otlp.mapping import (
    DEFAULT_SERVICE_NAME,
    MappingParams,
    build_resource_attributes,
    map_events,
    parse_path,
    parse_severity,
    parse_timestamp,
    to_any_value,
)

_OBSERVED_NS = 1_700_000_000_000_000_000
_ISO_NS = 1_772_005_425_123_456_000


def _params(**kwargs) -> MappingParams:
    return MappingParams(flatten=True, **kwargs)


def _records(events, params=None):
    batch = map_events(
        events,
        params or _params(),
        observed_ns=_OBSERVED_NS,
    )
    request = batch.requests[0]

    return request.resource_logs[0].scope_logs[0].log_records


def test_scalar_values_keep_their_types():
    assert to_any_value('a').string_value == 'a'
    assert to_any_value(True).bool_value is True
    assert to_any_value(7).int_value == 7
    assert to_any_value(1.5).double_value == 1.5


def test_out_of_range_int_falls_back_to_string():
    assert to_any_value(2**63).string_value == str(2**63)


def test_non_finite_float_falls_back_to_string():
    assert to_any_value(math.inf).string_value == 'inf'


def test_event_becomes_record_with_body_and_attributes():
    records = _records(['{"message": "hi", "code": 5}'])

    assert len(records) == 1
    assert records[0].body.string_value == '{"message": "hi", "code": 5}'
    assert records[0].observed_time_unix_nano == _OBSERVED_NS

    attributes = {kv.key: kv.value for kv in records[0].attributes}
    assert attributes['message'].string_value == 'hi'
    assert attributes['code'].int_value == 5


def test_nested_objects_flatten_to_dotted_keys():
    records = _records(['{"host": {"name": "srv-1"}}'])

    attributes = {kv.key: kv.value for kv in records[0].attributes}
    assert attributes['host.name'].string_value == 'srv-1'


def test_arrays_stay_typed():
    records = _records(['{"ips": ["10.0.0.1", "10.0.0.2"]}'])

    attributes = {kv.key: kv.value for kv in records[0].attributes}
    values = attributes['ips'].array_value.values
    assert [value.string_value for value in values] == [
        '10.0.0.1',
        '10.0.0.2',
    ]


def test_nulls_are_dropped():
    records = _records(['{"a": null, "b": 1}'])

    assert [kv.key for kv in records[0].attributes] == ['b']


def test_non_json_event_carries_no_attributes():
    records = _records(['plain line'])

    assert records[0].body.string_value == 'plain line'
    assert list(records[0].attributes) == []


def test_parse_timestamp_reads_iso_with_offset():
    assert parse_timestamp('2026-02-25T07:43:45.123456+00:00') == _ISO_NS


def test_parse_timestamp_reads_naive_iso_as_utc():
    assert parse_timestamp('2026-02-25T07:43:45.123456') == _ISO_NS


def test_parse_timestamp_reads_units_by_magnitude():
    assert parse_timestamp(1_772_000_625) == 1_772_000_625_000_000_000
    assert parse_timestamp(1_772_000_625_123) == 1_772_000_625_123_000_000
    assert parse_timestamp(1_772_000_625_123_456) == 1_772_000_625_123_456_000
    assert parse_timestamp(_ISO_NS) == _ISO_NS


def test_parse_timestamp_returns_none_for_garbage():
    assert parse_timestamp('yesterday') is None
    assert parse_timestamp(None) is None


def test_parse_timestamp_returns_none_for_out_of_range():
    assert parse_timestamp('1969-12-31T00:00:00+00:00') is None
    assert parse_timestamp(-1_772_000_625) is None
    assert parse_timestamp(2**64) is None


def test_parse_severity_maps_names():
    assert parse_severity('info') == (9, 'info')
    assert parse_severity('WARNING') == (13, 'WARNING')
    assert parse_severity('critical') == (18, 'critical')


def test_parse_severity_keeps_unknown_text():
    assert parse_severity('spam') == (0, 'spam')


def test_parse_severity_takes_number_as_is():
    assert parse_severity(17) == (17, '')


def test_record_takes_time_and_severity_from_fields():
    params = MappingParams(
        flatten=True,
        timestamp_path=('@timestamp',),
        severity_path=('log', 'level'),
    )
    records = _records(
        [
            '{"@timestamp": "2026-02-25T07:43:45.123456+00:00",'
            ' "log": {"level": "warn"}, "message": "hi"}',
        ],
        params,
    )

    assert records[0].time_unix_nano == _ISO_NS
    assert records[0].observed_time_unix_nano == _OBSERVED_NS
    assert records[0].severity_number == 13
    assert records[0].severity_text == 'warn'

    attributes = {kv.key: kv.value for kv in records[0].attributes}
    assert '@timestamp' not in attributes
    assert 'log.level' not in attributes
    assert attributes['message'].string_value == 'hi'


def test_unparsable_timestamp_falls_back_and_is_counted():
    params = MappingParams(flatten=True, timestamp_path=('@timestamp',))
    batch = map_events(
        ['{"@timestamp": "yesterday"}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    records = batch.requests[0].resource_logs[0].scope_logs[0].log_records

    assert records[0].time_unix_nano == _OBSERVED_NS
    assert batch.fallback_timestamps == 1


def test_pre_epoch_timestamp_falls_back_and_is_counted():
    params = MappingParams(flatten=True, timestamp_path=('@timestamp',))
    batch = map_events(
        ['{"@timestamp": "1969-12-31T00:00:00+00:00"}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    records = batch.requests[0].resource_logs[0].scope_logs[0].log_records

    assert records[0].time_unix_nano == _OBSERVED_NS
    assert batch.fallback_timestamps == 1


def test_parse_path_splits_dotted_field():
    assert parse_path('log.level') == ('log', 'level')
    assert parse_path('@timestamp') == ('@timestamp',)
    assert parse_path(None) is None


def test_build_resource_attributes_carries_service_and_sdk_info():
    attributes = {
        kv.key: kv.value
        for kv in build_resource_attributes(
            static={},
            service_name='linux-syslog',
        )
    }

    assert attributes['service.name'].string_value == 'linux-syslog'
    assert attributes['telemetry.sdk.name'].string_value == 'eventum'
    assert attributes['telemetry.sdk.language'].string_value == 'python'
    assert 'telemetry.sdk.version' in attributes


def test_build_resource_attributes_uses_default_service_name():
    attributes = {
        kv.key: kv.value
        for kv in build_resource_attributes(
            static={},
            service_name=DEFAULT_SERVICE_NAME,
        )
    }

    assert attributes['service.name'].string_value == DEFAULT_SERVICE_NAME


def test_build_resource_attributes_static_overrides_defaults():
    attributes = {
        kv.key: kv.value
        for kv in build_resource_attributes(
            static={'service.name': 'custom', 'team': 'sec'},
            service_name='linux-syslog',
        )
    }

    assert attributes['service.name'].string_value == 'custom'
    assert attributes['team'].string_value == 'sec'


def test_records_group_by_lifted_resource_attributes():
    params = MappingParams(
        flatten=True,
        resource_paths=(('host.name', ('host', 'name')),),
    )
    batch = map_events(
        [
            '{"host": {"name": "srv-1"}, "n": 1}',
            '{"host": {"name": "srv-2"}, "n": 2}',
            '{"host": {"name": "srv-1"}, "n": 3}',
        ],
        params,
        observed_ns=_OBSERVED_NS,
    )
    resource_logs = batch.requests[0].resource_logs

    assert len(resource_logs) == 2
    assert batch.records == 3

    names = [
        next(
            kv.value.string_value
            for kv in entry.resource.attributes
            if kv.key == 'host.name'
        )
        for entry in resource_logs
    ]
    assert names == ['srv-1', 'srv-2']

    first = resource_logs[0].scope_logs[0].log_records
    assert len(first) == 2
    assert all(
        'host.name' not in {kv.key for kv in record.attributes}
        for record in first
    )


def test_non_scalar_resource_value_stays_in_record_attributes():
    params = MappingParams(
        flatten=True,
        resource_paths=(('tags', ('tags',)),),
    )
    batch = map_events(
        ['{"tags": ["a", "b"]}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    resource_logs = batch.requests[0].resource_logs

    assert len(resource_logs) == 1
    assert 'tags' not in {
        kv.key for kv in resource_logs[0].resource.attributes
    }

    records = resource_logs[0].scope_logs[0].log_records
    attributes = {kv.key: kv.value for kv in records[0].attributes}
    values = attributes['tags'].array_value.values
    assert [value.string_value for value in values] == ['a', 'b']


def test_dict_resource_value_stays_in_record_attributes():
    params = MappingParams(
        flatten=True,
        resource_paths=(('meta', ('meta',)),),
    )
    batch = map_events(
        ['{"meta": {"a": 1}}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    resource_logs = batch.requests[0].resource_logs

    assert len(resource_logs) == 1
    assert 'meta' not in {
        kv.key for kv in resource_logs[0].resource.attributes
    }

    records = resource_logs[0].scope_logs[0].log_records
    attributes = {kv.key: kv.value for kv in records[0].attributes}
    assert attributes['meta.a'].int_value == 1


def test_null_resource_value_is_not_lifted():
    params = MappingParams(
        flatten=True,
        resource_paths=(('host.name', ('host', 'name')),),
    )
    batch = map_events(
        ['{"host": {"name": null}}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    resource_logs = batch.requests[0].resource_logs

    assert len(resource_logs) == 1
    assert 'host.name' not in {
        kv.key for kv in resource_logs[0].resource.attributes
    }

    records = resource_logs[0].scope_logs[0].log_records
    assert 'host.name' not in {kv.key for kv in records[0].attributes}


def test_lifted_value_wins_over_static_attribute_with_same_key():
    params = MappingParams(
        flatten=True,
        resource_attributes=build_resource_attributes(
            static={'host.name': 'static-value'},
            service_name='svc',
        ),
        resource_paths=(('host.name', ('host', 'name')),),
    )
    batch = map_events(
        ['{"host": {"name": "srv-1"}}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    resource = batch.requests[0].resource_logs[0].resource
    matches = [kv for kv in resource.attributes if kv.key == 'host.name']

    assert len(matches) == 1
    assert matches[0].value.string_value == 'srv-1'
