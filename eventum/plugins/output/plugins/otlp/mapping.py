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
from opentelemetry.proto.logs.v1.logs_pb2 import (
    LogRecord,
    ResourceLogs,
    SeverityNumber,
)
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

    body_path : tuple[str, ...] | None
        Path of the field carrying the record body, `None` when the
        whole event should always be used as the body.

    """

    flatten: bool
    timestamp_path: tuple[str, ...] | None = None
    severity_path: tuple[str, ...] | None = None
    resource_attributes: tuple[KeyValue, ...] = ()
    resource_paths: tuple[tuple[str, tuple[str, ...]], ...] = ()
    body_path: tuple[str, ...] | None = None


@dataclass(frozen=True, slots=True)
class MappedBatch:
    """Result of mapping a batch of events.

    Attributes
    ----------
    requests : list[ExportLogsServiceRequest]
        Requests carrying the mapped records, split so that none of
        them exceeds the configured request size budget.

    records_per_request : list[int]
        Number of records each request in `requests` carries, one
        entry per request, in the same order.

    records : int
        Number of records across all requests.

    fallback_timestamps : int
        Number of records whose time fell back to the time of
        writing, since the event carried no usable timestamp.

    missing_bodies : int
        Number of records whose body fell back to the whole event,
        since the event carried no usable value at the body path.

    oversized_records : int
        Number of records that alone exceed the request size budget.
        Each was still sent, alone in a request of its own.

    """

    requests: list[ExportLogsServiceRequest] = field(default_factory=list)
    records_per_request: list[int] = field(default_factory=list)
    records: int = 0
    fallback_timestamps: int = 0
    missing_bodies: int = 0
    oversized_records: int = 0


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

    missing_body : bool
        Whether the record's body fell back to the whole event,
        since the event carried no usable value at the body path.

    """

    record: LogRecord
    fallback_timestamp: bool
    lifted: tuple[tuple[str, object], ...] = ()
    missing_body: bool = False


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
    """Return a copy of data without the value at the path.

    A mapping left empty by the removal is dropped in turn, at every
    level along the path, so consuming a leaf never leaves behind an
    empty parent attribute.

    """
    head, *rest = path

    if head not in data:
        return data

    if not rest:
        return {key: value for key, value in data.items() if key != head}

    nested = data[head]

    if not isinstance(nested, dict):
        return data

    dropped = _drop(nested, tuple(rest))

    if not dropped:
        return {key: value for key, value in data.items() if key != head}

    return {**data, head: dropped}


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
        case float() if not math.isfinite(value):
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
        value names no known severity. Whenever the number cannot be
        determined, the text carries the value's string form instead
        of being left empty, so the value is not lost.

    """
    match value:
        case bool():
            return 0, str(value)
        case int() if SEVERITY_NUMBER_MIN <= value <= SEVERITY_NUMBER_MAX:
            return value, ''
        case int() | float():
            return 0, str(value)
        case str():
            return SEVERITY_NUMBERS.get(value.strip().lower(), 0), value
        case _:
            return 0, str(value)


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

    A missing, null, list, or dict value is left in place: a null or
    absent one carries nothing to lift, and a list or dict is not
    hashable, so none of them can enter the resource key. A null value
    stays a record attribute, where `to_attributes` drops it.

    Returns
    -------
    tuple[tuple[tuple[str, object], ...], list[tuple[str, ...]]]
        Lifted name/value pairs, and the paths consumed from `data`.

    """
    lifted: list[tuple[str, object]] = []
    consumed: list[tuple[str, ...]] = []

    for name, path in paths:
        value = _lookup(data, path)

        skip = (
            value is _MISSING
            or value is None
            or isinstance(value, list | dict)
        )
        if skip:
            continue

        consumed.append(path)
        lifted.append((name, value))

    return tuple(lifted), consumed


def _apply_body(
    record: LogRecord,
    data: dict,
    path: tuple[str, ...] | None,
) -> tuple[bool, tuple[str, ...] | None]:
    """Set the record's body from the field at the path.

    Parameters
    ----------
    record : LogRecord
        Record whose body is set, left untouched when the path
        carries no usable value.

    data : dict
        Event fields to look the value up in.

    path : tuple[str, ...] | None
        Path of the body field, `None` when the whole event should
        always be used as the body.

    Returns
    -------
    tuple[bool, tuple[str, ...] | None]
        Whether the body fell back to the whole event, and the path
        consumed from `data`, `None` when nothing was consumed.

    """
    if path is None:
        return False, None

    value = _lookup(data, path)

    if value is _MISSING or value is None:
        return True, None

    record.body.CopyFrom(to_any_value(value))

    return False, path


def _to_record(
    event: str,
    params: MappingParams,
    observed_ns: int,
) -> _RecordResult:
    """Map a single event to a log record.

    Returns
    -------
    _RecordResult
        Record, whether its time and body fell back to the time of
        writing and the whole event respectively, and the values
        lifted into the record's resource.

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

    missing_body, body_path = _apply_body(record, data, params.body_path)

    if body_path is not None:
        consumed.append(body_path)

    for path in consumed:
        data = _drop(data, path)

    record.attributes.extend(to_attributes(data, flatten=params.flatten))

    return _RecordResult(
        record=record,
        fallback_timestamp=fallback,
        lifted=lifted,
        missing_body=missing_body,
    )


def _merge_resource_attributes(
    base: tuple[KeyValue, ...],
    lifted: tuple[tuple[str, object], ...],
) -> list[KeyValue]:
    """Merge lifted values into the resource's base attributes.

    Parameters
    ----------
    base : tuple[KeyValue, ...]
        Attributes every resource of the plugin carries.

    lifted : tuple[tuple[str, object], ...]
        Values lifted from one group of events, taking precedence
        over `base` on a key collision since they come from the
        event itself rather than a plugin-wide default.

    Returns
    -------
    list[KeyValue]
        Merged attributes, `base` order kept and any new lifted key
        appended after it.

    """
    attributes: dict[str, KeyValue] = {kv.key: kv for kv in base}
    attributes.update(
        (key, KeyValue(key=key, value=to_any_value(value)))
        for key, value in lifted
    )

    return list(attributes.values())


def _varint_len(value: int) -> int:
    """Length in bytes of `value` encoded as a protobuf unsigned varint.

    Parameters
    ----------
    value : int
        Non-negative value to measure, a byte count in every call
        site of this module.

    Returns
    -------
    int
        Number of bytes the varint encoding takes.

    """
    length = 1
    value >>= 7

    while value:
        length += 1
        value >>= 7

    return length


def _framed_size(content_size: int) -> int:
    """Bytes a length-delimited field of `content_size` adds once
    embedded in its parent message: one tag byte plus the varint
    encoding of the length, on top of the content itself.

    Parameters
    ----------
    content_size : int
        Byte size of the field's content, without its own tag and
        length prefix.

    Returns
    -------
    int
        Total bytes the field contributes to its parent.

    Notes
    -----
    Every field this module frames (`resource`, `scope`, a log
    record, a `ScopeLogs` entry, a `ResourceLogs` entry) has a field
    number below 16, so its tag always fits a single byte.

    """
    return 1 + _varint_len(content_size) + content_size


@dataclass(frozen=True, slots=True)
class _PackResult:
    """Result of packing grouped records into requests.

    Attributes
    ----------
    requests : list[ExportLogsServiceRequest]
        Requests carrying the packed records.

    records_per_request : list[int]
        Number of records each request in `requests` carries, one
        entry per request, in the same order.

    oversized_records : int
        Number of records that alone exceed the request size budget.

    """

    requests: list[ExportLogsServiceRequest]
    records_per_request: list[int]
    oversized_records: int


@dataclass(frozen=True, slots=True)
class _PackingContext:
    """Values constant across every group being packed.

    Attributes
    ----------
    scope : InstrumentationScope
        Scope every record is reported under.

    scope_field_frame : int
        Bytes the `scope` field contributes once embedded in a
        `ScopeLogs` entry with no records yet.

    max_request_bytes : int | None
        Approximate byte budget of a single request, `None` puts
        every record into one request regardless of size.

    """

    scope: InstrumentationScope
    scope_field_frame: int
    max_request_bytes: int | None


@dataclass(slots=True)
class _Packer:
    """Requests accumulated so far, plus the one under construction.

    Attributes
    ----------
    request : ExportLogsServiceRequest
        Request accumulating records until it is flushed.

    requests : list[ExportLogsServiceRequest]
        Completed requests, in the order they were flushed.

    records_per_request : list[int]
        Record counts of `requests`, one entry per request in the
        same order.

    size : int
        Exact protobuf byte size `request` will have once flushed.

    records : int
        Number of records `request` carries so far.

    """

    request: ExportLogsServiceRequest
    requests: list[ExportLogsServiceRequest] = field(default_factory=list)
    records_per_request: list[int] = field(default_factory=list)
    size: int = 0
    records: int = 0


def _flush(packer: _Packer) -> None:
    """Move a non-empty request under construction into `packer`'s
    output lists and reset it to a fresh, empty request.
    """
    if packer.records:
        packer.requests.append(packer.request)
        packer.records_per_request.append(packer.records)

    packer.request = ExportLogsServiceRequest()
    packer.size = 0
    packer.records = 0


def _pack_group(
    packer: _Packer,
    context: _PackingContext,
    resource: Resource,
    records: list[LogRecord],
) -> int:
    """Pack one group's records into `packer`, splitting into further
    requests as needed.

    Parameters
    ----------
    packer : _Packer
        Requests accumulated so far, mutated in place: records are
        appended to its request under construction, which is flushed
        into its output lists whenever the budget forces a split.

    context : _PackingContext
        Values constant across every group of this call.

    resource : Resource
        Resource of the group.

    records : list[LogRecord]
        Records of the group, in encounter order.

    Returns
    -------
    int
        Number of records in the group that alone exceed the budget.

    """
    max_request_bytes = context.max_request_bytes
    scope_field_frame = context.scope_field_frame

    group_entry: ResourceLogs | None = None
    scope_logs_content = 0
    group_frame_size = 0
    oversized_records = 0
    resource_frame_size = _framed_size(resource.ByteSize())

    for record in records:
        record_size = record.ByteSize()
        record_frame_size = _framed_size(record_size)
        fresh_content = scope_field_frame + record_frame_size
        fresh_frame_size = _framed_size(
            resource_frame_size + _framed_size(fresh_content),
        )

        if group_entry is None:
            candidate_content = fresh_content
            candidate_frame_size = fresh_frame_size
        else:
            candidate_content = scope_logs_content + record_frame_size
            candidate_frame_size = _framed_size(
                resource_frame_size + _framed_size(candidate_content),
            )

        addition = candidate_frame_size - group_frame_size

        must_split = (
            max_request_bytes is not None
            and packer.records
            and packer.size + addition > max_request_bytes
        )
        if must_split:
            _flush(packer)
            group_entry = None
            candidate_content = fresh_content
            candidate_frame_size = fresh_frame_size
            addition = candidate_frame_size

        if max_request_bytes is not None and (
            fresh_frame_size > max_request_bytes
        ):
            oversized_records += 1

        if group_entry is None:
            group_entry = packer.request.resource_logs.add()
            group_entry.resource.CopyFrom(resource)
            group_entry.scope_logs.add().scope.CopyFrom(context.scope)

        group_entry.scope_logs[0].log_records.append(record)
        scope_logs_content = candidate_content
        group_frame_size = candidate_frame_size
        packer.size += addition
        packer.records += 1

    return oversized_records


def _pack_requests(
    groups: dict[tuple[tuple[str, object], ...], list[LogRecord]],
    base_attributes: tuple[KeyValue, ...],
    max_request_bytes: int | None,
) -> _PackResult:
    """Pack grouped records into requests within the size budget.

    A new request starts whenever adding the next record would push
    the current request's size past `max_request_bytes`. A record
    that alone exceeds the budget is still added, alone in a request
    of its own. A new group never joins a `ResourceLogs` entry
    created for another group, even when the current request has
    room left.

    Parameters
    ----------
    groups : dict[tuple[tuple[str, object], ...], list[LogRecord]]
        Records to pack, grouped by resource, in the order each
        resource first appeared.

    base_attributes : tuple[KeyValue, ...]
        Attributes every resource of the plugin carries.

    max_request_bytes : int | None
        Approximate byte budget of a single request, `None` puts
        every record into one request regardless of size.

    Returns
    -------
    _PackResult
        Requests, the number of records each of them carries in the
        same order, and the number of records that alone exceeded
        the budget.

    """
    scope = _scope()
    context = _PackingContext(
        scope=scope,
        scope_field_frame=_framed_size(scope.ByteSize()),
        max_request_bytes=max_request_bytes,
    )
    packer = _Packer(request=ExportLogsServiceRequest())
    oversized_records = 0

    for lifted, records in groups.items():
        resource = Resource(
            attributes=_merge_resource_attributes(base_attributes, lifted),
        )
        oversized_records += _pack_group(packer, context, resource, records)

    _flush(packer)

    return _PackResult(
        requests=packer.requests,
        records_per_request=packer.records_per_request,
        oversized_records=oversized_records,
    )


def map_events(
    events: Sequence[str],
    params: MappingParams,
    *,
    observed_ns: int,
    max_request_bytes: int | None = None,
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

    max_request_bytes : int | None, default=None
        Approximate byte budget of a single request. `None` puts
        every record into one request regardless of size.

    Returns
    -------
    MappedBatch
        Requests carrying the mapped records, grouped into one
        `ResourceLogs` entry per distinct resource, in the order each
        resource first appeared, and split so that none of them
        exceeds `max_request_bytes`.

    Notes
    -----
    The budget is checked against the exact protobuf byte size the
    request under construction will have once flushed, including the
    tag and length prefix each record and each `ResourceLogs` entry
    adds once embedded in it. This still does not reflect `http/json`
    encoding, which is larger than protobuf, or gzip compression,
    which is smaller.

    """
    if not events:
        return MappedBatch()

    groups: dict[tuple[tuple[str, object], ...], list[LogRecord]] = {}
    fallback_timestamps = 0
    missing_bodies = 0

    for event in events:
        result = _to_record(event, params, observed_ns)

        if result.fallback_timestamp:
            fallback_timestamps += 1

        if result.missing_body:
            missing_bodies += 1

        groups.setdefault(result.lifted, []).append(result.record)

    pack_result = _pack_requests(
        groups,
        params.resource_attributes,
        max_request_bytes,
    )

    return MappedBatch(
        requests=pack_result.requests,
        records_per_request=pack_result.records_per_request,
        records=len(events),
        fallback_timestamps=fallback_timestamps,
        missing_bodies=missing_bodies,
        oversized_records=pack_result.oversized_records,
    )
