"""Mapping of events to OTLP log records."""

import math
from collections.abc import Sequence
from dataclasses import dataclass, field

import msgspec
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
    ExportLogsServiceRequest,
)
from opentelemetry.proto.common.v1.common_pb2 import (
    AnyValue,
    ArrayValue,
    InstrumentationScope,
    KeyValue,
    KeyValueList,
)
from opentelemetry.proto.logs.v1.logs_pb2 import LogRecord

import eventum

INT64_MIN = -(2**63)
INT64_MAX = 2**63 - 1

SCOPE_NAME = 'eventum'

_DECODER = msgspec.json.Decoder()


@dataclass(frozen=True, slots=True)
class MappingParams:
    """Parameters of mapping resolved from plugin config.

    Attributes
    ----------
    flatten : bool
        Whether to flatten nested objects into dotted attribute keys.

    """

    flatten: bool


@dataclass(frozen=True, slots=True)
class MappedBatch:
    """Result of mapping a batch of events.

    Attributes
    ----------
    requests : list[ExportLogsServiceRequest]
        Requests carrying the mapped records.

    records_per_request : list[int]
        Number of records each request carries.

    records : int
        Number of records across all requests.

    """

    requests: list[ExportLogsServiceRequest] = field(default_factory=list)
    records_per_request: list[int] = field(default_factory=list)
    records: int = 0


def _int_any_value(value: int) -> AnyValue:
    """Convert an int to its OTLP representation."""
    if INT64_MIN <= value <= INT64_MAX:
        return AnyValue(int_value=value)

    return AnyValue(string_value=str(value))


def _float_any_value(value: float) -> AnyValue:
    """Convert a float to its OTLP representation."""
    if math.isfinite(value):
        return AnyValue(double_value=value)

    return AnyValue(string_value=str(value))


def to_any_value(value: object) -> AnyValue:
    """Convert a JSON value to its OTLP representation.

    Parameters
    ----------
    value : object
        Value to convert.

    Returns
    -------
    AnyValue
        Converted value, values that OTLP cannot carry natively are
        converted to their string representation.

    Notes
    -----
    A plain string is handled by the fallback branch: converting it
    with `str` is a no-op, so no dedicated branch is needed for it.

    """
    match value:
        case bool():
            return AnyValue(bool_value=value)
        case int():
            return _int_any_value(value)
        case float():
            return _float_any_value(value)
        case list():
            return AnyValue(
                array_value=ArrayValue(
                    values=[to_any_value(item) for item in value],
                ),
            )
        case dict():
            return AnyValue(
                kvlist_value=KeyValueList(
                    values=[
                        KeyValue(key=str(key), value=to_any_value(item))
                        for key, item in value.items()
                        if item is not None
                    ],
                ),
            )
        case _:
            return AnyValue(string_value=str(value))


def to_attributes(data: dict, *, flatten: bool) -> list[KeyValue]:
    """Convert event fields to record attributes.

    Parameters
    ----------
    data : dict
        Fields to convert.

    flatten : bool
        Whether to flatten nested objects into dotted keys.

    Returns
    -------
    list[KeyValue]
        Converted attributes, `None` values are dropped.

    """
    attributes: list[KeyValue] = []

    for key, value in data.items():
        if value is None:
            continue

        if flatten and isinstance(value, dict):
            attributes.extend(
                KeyValue(key=f'{key}.{nested.key}', value=nested.value)
                for nested in to_attributes(value, flatten=flatten)
            )
            continue

        attributes.append(KeyValue(key=str(key), value=to_any_value(value)))

    return attributes


def _scope() -> InstrumentationScope:
    """Build scope identifying Eventum."""
    return InstrumentationScope(
        name=SCOPE_NAME,
        version=eventum.__version__,
    )


def _to_record(
    event: str,
    params: MappingParams,
    observed_ns: int,
) -> LogRecord:
    """Map a single event to a log record."""
    record = LogRecord(
        observed_time_unix_nano=observed_ns,
        time_unix_nano=observed_ns,
        body=AnyValue(string_value=event),
    )

    try:
        data = _DECODER.decode(event)
    except msgspec.DecodeError:
        return record

    if not isinstance(data, dict):
        return record

    record.attributes.extend(to_attributes(data, flatten=params.flatten))

    return record


def map_events(
    events: Sequence[str],
    params: MappingParams,
    *,
    observed_ns: int,
) -> MappedBatch:
    """Map events to OTLP export requests.

    Parameters
    ----------
    events : Sequence[str]
        Events to map.

    params : MappingParams
        Parameters of mapping.

    observed_ns : int
        Time of writing in unix nanoseconds.

    Returns
    -------
    MappedBatch
        Requests carrying the mapped records.

    """
    if not events:
        return MappedBatch()

    request = ExportLogsServiceRequest()
    resource_logs = request.resource_logs.add()
    scope_logs = resource_logs.scope_logs.add()
    scope_logs.scope.CopyFrom(_scope())

    for event in events:
        scope_logs.log_records.append(
            _to_record(event, params, observed_ns),
        )

    return MappedBatch(
        requests=[request],
        records_per_request=[len(events)],
        records=len(events),
    )
