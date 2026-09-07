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


def test_parse_timestamp_returns_none_for_non_finite_float():
    assert parse_timestamp(math.inf) is None
    assert parse_timestamp(math.nan) is None
    assert parse_timestamp(-math.inf) is None


def test_parse_severity_maps_names():
    assert parse_severity('info') == (9, 'info')
    assert parse_severity('WARNING') == (13, 'WARNING')
    assert parse_severity('critical') == (18, 'critical')


def test_parse_severity_keeps_unknown_text():
    assert parse_severity('spam') == (0, 'spam')


def test_parse_severity_takes_number_as_is():
    assert parse_severity(17) == (17, '')


def test_parse_severity_out_of_range_number_keeps_text():
    # 0 is the realistic trigger: a syslog severity code (0-7) read
    # through severity_field, below this module's SEVERITY_NUMBER_MIN.
    assert parse_severity(0) == (0, '0')
    assert parse_severity(99) == (0, '99')


def test_parse_severity_float_keeps_text():
    assert parse_severity(9.5) == (0, '9.5')


def test_parse_severity_fallback_keeps_text():
    assert parse_severity(None) == (0, 'None')


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


def test_body_field_takes_the_value_with_its_type():
    params = MappingParams(flatten=True, body_path=('event', 'original'))
    records = _records(
        ['{"event": {"original": "raw line"}, "n": 1}'],
        params,
    )

    assert records[0].body.string_value == 'raw line'
    attributes = {kv.key: kv.value for kv in records[0].attributes}
    assert 'event.original' not in attributes
    assert attributes['n'].int_value == 1


def test_body_field_keeps_structured_values_structured():
    params = MappingParams(flatten=True, body_path=('payload',))
    records = _records(['{"payload": {"a": 1}}'], params)

    values = records[0].body.kvlist_value.values
    assert values[0].key == 'a'
    assert values[0].value.int_value == 1


def test_missing_body_field_falls_back_to_the_event():
    params = MappingParams(flatten=True, body_path=('nope',))
    batch = map_events(
        ['{"a": 1}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    records = batch.requests[0].resource_logs[0].scope_logs[0].log_records

    assert records[0].body.string_value == '{"a": 1}'
    assert batch.missing_bodies == 1


def test_unflattened_attributes_stay_maps():
    params = MappingParams(flatten=False)
    records = _records(['{"host": {"name": "srv-1"}}'], params)

    attributes = {kv.key: kv.value for kv in records[0].attributes}
    nested = attributes['host'].kvlist_value.values
    assert nested[0].key == 'name'
    assert nested[0].value.string_value == 'srv-1'


def test_null_body_field_falls_back_to_the_event():
    params = MappingParams(flatten=True, body_path=('a',))
    batch = map_events(
        ['{"a": null}'],
        params,
        observed_ns=_OBSERVED_NS,
    )
    records = batch.requests[0].resource_logs[0].scope_logs[0].log_records

    assert records[0].body.string_value == '{"a": null}'
    assert batch.missing_bodies == 1


def test_oversized_batch_splits_into_several_requests():
    event = '{"blob": "' + 'x' * 2000 + '"}'
    batch = map_events(
        [event] * 10,
        _params(),
        observed_ns=_OBSERVED_NS,
        max_request_bytes=8000,
    )

    assert len(batch.requests) > 1
    assert sum(batch.records_per_request) == 10
    assert batch.records == 10
    assert all(
        request.ByteSize() <= 8000 or count == 1
        for request, count in zip(
            batch.requests,
            batch.records_per_request,
            strict=True,
        )
    )


def test_split_keeps_several_records_per_request_within_budget():
    event = '{"pad": "AAAA"}'
    batch = map_events(
        [event] * 40,
        _params(),
        observed_ns=_OBSERVED_NS,
        max_request_bytes=220,
    )

    assert len(batch.requests) > 1
    assert sum(batch.records_per_request) == 40
    assert any(count > 1 for count in batch.records_per_request)
    assert all(
        request.ByteSize() <= 220 or count == 1
        for request, count in zip(
            batch.requests,
            batch.records_per_request,
            strict=True,
        )
    )


def test_unbounded_batch_stays_in_one_request():
    event = '{"blob": "' + 'x' * 2000 + '"}'
    batch = map_events([event] * 10, _params(), observed_ns=_OBSERVED_NS)

    assert len(batch.requests) == 1
    assert batch.records_per_request == [10]
    assert batch.oversized_records == 0


def test_oversized_record_gets_its_own_request_and_is_counted():
    event = '{"blob": "' + 'x' * 2000 + '"}'
    batch = map_events(
        [event],
        _params(),
        observed_ns=_OBSERVED_NS,
        max_request_bytes=1024,
    )

    assert len(batch.requests) == 1
    assert batch.records_per_request == [1]
    assert batch.oversized_records == 1


def test_split_never_mixes_resources_and_keeps_first_seen_order():
    params = MappingParams(
        flatten=True,
        resource_paths=(('host.name', ('host', 'name')),),
    )
    blob = 'x' * 2000
    events = [
        f'{{"host": {{"name": "srv-1"}}, "blob": "{blob}"}}',
        f'{{"host": {{"name": "srv-2"}}, "blob": "{blob}"}}',
        f'{{"host": {{"name": "srv-1"}}, "blob": "{blob}"}}',
    ]
    batch = map_events(
        events,
        params,
        observed_ns=_OBSERVED_NS,
        max_request_bytes=4200,
    )

    assert sum(batch.records_per_request) == 3

    seen_names: list[str] = []

    for request in batch.requests:
        for resource_logs in request.resource_logs:
            names = {
                kv.value.string_value
                for kv in resource_logs.resource.attributes
                if kv.key == 'host.name'
            }
            assert len(names) == 1
            seen_names.append(next(iter(names)))

    first_seen = list(dict.fromkeys(seen_names))
    assert first_seen == ['srv-1', 'srv-2']


def test_split_stays_within_budget_with_protobuf_framing_accounted():
    # At this record count and the default budget, the tag byte and
    # length varint each record and each ResourceLogs entry adds once
    # embedded in the request is no longer a few bytes of slack: an
    # accounting that ignores it drifts past the budget it is meant
    # to enforce.
    event = '{"blob": "' + 'x' * 360 + '"}'
    budget = 4 * 1024 * 1024
    batch = map_events(
        [event] * 12000,
        _params(),
        observed_ns=_OBSERVED_NS,
        max_request_bytes=budget,
    )

    assert len(batch.requests) > 1
    assert sum(batch.records_per_request) == 12000
    assert batch.records == 12000
    assert all(request.ByteSize() <= budget for request in batch.requests)


def test_consumed_leaf_drops_empty_parent_without_flattening():
    params = MappingParams(flatten=False, severity_path=('log', 'level'))
    records = _records(['{"log": {"level": "warn"}}'], params)

    assert list(records[0].attributes) == []


def test_consumed_leaf_drops_empty_grandparent_without_flattening():
    params = MappingParams(flatten=False, body_path=('a', 'b', 'c'))
    records = _records(['{"a": {"b": {"c": "v"}}, "n": 1}'], params)

    attributes = {kv.key: kv.value for kv in records[0].attributes}
    assert 'a' not in attributes
    assert attributes['n'].int_value == 1


def test_consumed_leaf_keeps_sibling_fields_in_parent():
    params = MappingParams(flatten=False, severity_path=('log', 'level'))
    records = _records(
        ['{"log": {"level": "warn", "logger": "app"}}'],
        params,
    )

    attributes = {kv.key: kv.value for kv in records[0].attributes}
    nested = attributes['log'].kvlist_value.values
    assert [kv.key for kv in nested] == ['logger']
