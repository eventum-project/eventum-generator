import math

from eventum.plugins.output.plugins.otlp.mapping import (
    MappingParams,
    map_events,
    to_any_value,
)

_OBSERVED_NS = 1_700_000_000_000_000_000


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
