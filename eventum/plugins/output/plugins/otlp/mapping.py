"""Mapping of events to OTLP log records."""

import math
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime

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
from opentelemetry.proto.logs.v1.logs_pb2 import LogRecord, SeverityNumber
from opentelemetry.proto.resource.v1.resource_pb2 import Resource

import eventum

INT64_MIN = -(2**63)
INT64_MAX = 2**63 - 1

SCOPE_NAME = 'eventum'

SERVICE_NAME_KEY = 'service.name'
DEFAULT_SERVICE_NAME = 'eventum'

SEVERITY_NUMBERS = {
    'trace': 1,
    'debug': 5,
    'verbose': 5,
    'info': 9,
    'information': 9,
    'informational': 9,
    'notice': 10,
    'warn': 13,
    'warning': 13,
    'error': 17,
    'err': 17,
    'severe': 17,
    'critical': 18,
    'crit': 18,
    'alert': 19,
    'fatal': 21,
    'panic': 21,
    'emergency': 22,
    'emerg': 22,
}

SEVERITY_NUMBER_MIN = 1
SEVERITY_NUMBER_MAX = 24

_DECODER = msgspec.json.Decoder()

_SECONDS_MAX = 10**11
_MILLISECONDS_MAX = 10**14
_MICROSECONDS_MAX = 10**17

_NS_MIN = 0
_NS_MAX = 2**64 - 1

_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)

_MISSING = object()


@dataclass(frozen=True, slots=True)
class MappingParams:
    """Parameters of mapping resolved from plugin config.

    Attributes
    ----------
    flatten : bool
        Whether to flatten nested objects into dotted attribute keys.

    timestamp_path : tuple[str, ...] | None
        Path of the field carrying the record time, `None` when the
        time of writing should always be used.

    severity_path : tuple[str, ...] | None
        Path of the field carrying the record severity, `None` when
        no severity should be read from the event.

    resource_attributes : tuple[KeyValue, ...]
        Attributes every resource of the plugin carries.

    resource_paths : tuple[tuple[str, tuple[str, ...]], ...]
        Resource attribute name paired with the dotted path of the
        event field whose value is lifted into it.

    """

    flatten: bool
    timestamp_path: tuple[str, ...] | None = None
    severity_path: tuple[str, ...] | None = None
    resource_attributes: tuple[KeyValue, ...] = ()
    resource_paths: tuple[tuple[str, tuple[str, ...]], ...] = ()


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

    fallback_timestamps : int
        Number of records whose time fell back to the time of
        writing, since the event carried no usable timestamp.

    """

    requests: list[ExportLogsServiceRequest] = field(default_factory=list)
    records_per_request: list[int] = field(default_factory=list)
    records: int = 0
    fallback_timestamps: int = 0


@dataclass(frozen=True, slots=True)
class _RecordResult:
    """Result of mapping a single event to a log record.

    Attributes
    ----------
    record : LogRecord
        Mapped record.

    fallback_timestamp : bool
        Whether the record's time fell back to the time of writing.

    lifted : tuple[tuple[str, object], ...]
        Values lifted from the event into the record's resource.

    """

    record: LogRecord
    fallback_timestamp: bool
    lifted: tuple[tuple[str, object], ...] = ()


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


def build_resource_attributes(
    static: dict[str, str | int | float | bool],
    service_name: str,
) -> tuple[KeyValue, ...]:
    """Build attributes every resource of the plugin carries.

    Parameters
    ----------
    static : dict[str, str | int | float | bool]
        Attributes from the plugin config.

    service_name : str
        Name of the service used when the config names none.

    Returns
    -------
    tuple[KeyValue, ...]
        Attributes of the resource.

    """
    attributes: dict[str, object] = {
        SERVICE_NAME_KEY: service_name,
        'telemetry.sdk.name': 'eventum',
        'telemetry.sdk.language': 'python',
        'telemetry.sdk.version': eventum.__version__,
    }
    attributes.update(static)

    return tuple(
        KeyValue(key=key, value=to_any_value(value))
        for key, value in attributes.items()
    )


def parse_path(value: str | None) -> tuple[str, ...] | None:
    """Split a dotted field path into its parts.

    Parameters
    ----------
    value : str | None
        Dotted field path, or `None` when no field is configured.

    Returns
    -------
    tuple[str, ...] | None
        Parts of the path, `None` when `value` is `None`.

    """
    if value is None:
        return None

    return tuple(value.split('.'))


def _lookup(data: dict, path: tuple[str, ...]) -> object:
    """Get the value at the path, `_MISSING` when it is absent."""
    current: object = data

    for part in path:
        if not isinstance(current, dict) or part not in current:
            return _MISSING

        current = current[part]

    return current


def _drop(data: dict, path: tuple[str, ...]) -> dict:
    """Return a copy of data without the value at the path."""
    head, *rest = path

    if head not in data:
        return data

    if not rest:
        return {key: value for key, value in data.items() if key != head}

    nested = data[head]

    if not isinstance(nested, dict):
        return data

    return {**data, head: _drop(nested, tuple(rest))}


def _checked_ns(nanoseconds: int) -> int | None:
    """Return nanoseconds when they fit an unsigned 64-bit field.

    Parameters
    ----------
    nanoseconds : int
        Value to check.

    Returns
    -------
    int | None
        `nanoseconds` unchanged, or `None` when it falls outside the
        range a protobuf `fixed64` can carry.

    """
    if _NS_MIN <= nanoseconds <= _NS_MAX:
        return nanoseconds

    return None


def parse_timestamp(value: object) -> int | None:
    """Convert a field value to unix nanoseconds.

    Parameters
    ----------
    value : object
        Value to convert, an ISO 8601 string or a number whose unit is
        taken from its magnitude.

    Returns
    -------
    int | None
        Unix nanoseconds, or `None` when the value carries no time or
        the result does not fit an unsigned 64-bit field.

    """
    match value:
        case bool():
            return None
        case int() | float():
            magnitude = abs(value)

            if magnitude < _SECONDS_MAX:
                multiplier = 10**9
            elif magnitude < _MILLISECONDS_MAX:
                multiplier = 10**6
            elif magnitude < _MICROSECONDS_MAX:
                multiplier = 10**3
            else:
                multiplier = 1

            return _checked_ns(int(value * multiplier))
        case str():
            try:
                parsed = datetime.fromisoformat(value)
            except ValueError:
                return None

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=UTC)

            delta = parsed - _EPOCH

            nanoseconds = (
                delta.days * 86_400 + delta.seconds
            ) * 10**9 + delta.microseconds * 10**3

            return _checked_ns(nanoseconds)
        case _:
            return None


def parse_severity(value: object) -> tuple[int, str]:
    """Convert a field value to severity number and text.

    Parameters
    ----------
    value : object
        Value to convert.

    Returns
    -------
    tuple[int, str]
        Severity number and severity text, the number is `0` when the
        value names no known severity.

    """
    match value:
        case bool():
            return 0, str(value)
        case int() if SEVERITY_NUMBER_MIN <= value <= SEVERITY_NUMBER_MAX:
            return value, ''
        case str():
            return SEVERITY_NUMBERS.get(value.strip().lower(), 0), value
        case _:
            return 0, ''


def _scope() -> InstrumentationScope:
    """Build scope identifying Eventum."""
    return InstrumentationScope(
        name=SCOPE_NAME,
        version=eventum.__version__,
    )


def _lift_resources(
    data: dict,
    paths: tuple[tuple[str, tuple[str, ...]], ...],
) -> tuple[tuple[tuple[str, object], ...], list[tuple[str, ...]]]:
    """Pick scalar values at the given paths for the record's resource.

    A list or dict value is left in place: it stays a record attribute
    and does not enter the resource key, since only scalars are
    hashable.

    Returns
    -------
    tuple[tuple[tuple[str, object], ...], list[tuple[str, ...]]]
        Lifted name/value pairs, and the paths consumed from `data`.

    """
    lifted: list[tuple[str, object]] = []
    consumed: list[tuple[str, ...]] = []

    for name, path in paths:
        value = _lookup(data, path)

        if value is _MISSING or isinstance(value, list | dict):
            continue

        consumed.append(path)
        lifted.append((name, value))

    return tuple(lifted), consumed


def _to_record(
    event: str,
    params: MappingParams,
    observed_ns: int,
) -> _RecordResult:
    """Map a single event to a log record.

    Returns
    -------
    _RecordResult
        Record, whether its time fell back to the time of writing,
        and the values lifted into the record's resource.

    """
    record = LogRecord(
        observed_time_unix_nano=observed_ns,
        time_unix_nano=observed_ns,
        body=AnyValue(string_value=event),
    )

    try:
        data = _DECODER.decode(event)
    except msgspec.DecodeError:
        return _RecordResult(record=record, fallback_timestamp=False)

    if not isinstance(data, dict):
        return _RecordResult(record=record, fallback_timestamp=False)

    fallback = False
    consumed: list[tuple[str, ...]] = []

    if params.timestamp_path is not None:
        value = _lookup(data, params.timestamp_path)

        if value is not _MISSING:
            consumed.append(params.timestamp_path)
            timestamp = parse_timestamp(value)

            if timestamp is None:
                fallback = True
            else:
                record.time_unix_nano = timestamp
        else:
            fallback = True

    if params.severity_path is not None:
        value = _lookup(data, params.severity_path)

        if value is not _MISSING:
            consumed.append(params.severity_path)
            number, text = parse_severity(value)
            record.severity_number = SeverityNumber.ValueType(number)
            record.severity_text = text

    lifted, lifted_paths = _lift_resources(data, params.resource_paths)
    consumed.extend(lifted_paths)

    for path in consumed:
        data = _drop(data, path)

    record.attributes.extend(to_attributes(data, flatten=params.flatten))

    return _RecordResult(
        record=record,
        fallback_timestamp=fallback,
        lifted=lifted,
    )


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
        Requests carrying the mapped records, grouped into one
        `ResourceLogs` entry per distinct resource, in the order each
        resource first appeared.

    """
    if not events:
        return MappedBatch()

    groups: dict[tuple[tuple[str, object], ...], list[LogRecord]] = {}
    fallback_timestamps = 0

    for event in events:
        result = _to_record(event, params, observed_ns)

        if result.fallback_timestamp:
            fallback_timestamps += 1

        groups.setdefault(result.lifted, []).append(result.record)

    request = ExportLogsServiceRequest()

    for lifted, records in groups.items():
        resource_logs = request.resource_logs.add()
        resource_logs.resource.CopyFrom(
            Resource(
                attributes=[
                    *params.resource_attributes,
                    *(
                        KeyValue(key=key, value=to_any_value(value))
                        for key, value in lifted
                    ),
                ],
            ),
        )
        scope_logs = resource_logs.scope_logs.add()
        scope_logs.scope.CopyFrom(_scope())
        scope_logs.log_records.extend(records)

    return MappedBatch(
        requests=[request],
        records_per_request=[len(events)],
        records=len(events),
        fallback_timestamps=fallback_timestamps,
    )
