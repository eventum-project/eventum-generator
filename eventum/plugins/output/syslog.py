"""Syslog messages: what they carry and how an event is rendered as
one.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import IntEnum, StrEnum
from typing import Annotated, Any, Literal, Self

import msgspec
from pydantic import (
    BaseModel,
    BeforeValidator,
    Field,
    field_validator,
    model_validator,
)

from eventum.plugins.output.event_fields import EventFieldRef, lookup_field
from eventum.plugins.output.exceptions import FormatError, FormatErrorKind
from eventum.plugins.output.fields import BaseFormatterConfig, Format

SYSLOG_NILVALUE = '-'
"""Value used by syslog for a header part that is not known."""


class SyslogRfc(IntEnum):
    """Specification the syslog message is built after."""

    RFC_5424 = 5424
    RFC_3164 = 3164


class SyslogFacility(StrEnum):
    """Syslog facility name."""

    KERN = 'kern'
    USER = 'user'
    MAIL = 'mail'
    DAEMON = 'daemon'
    AUTH = 'auth'
    SYSLOG = 'syslog'
    LPR = 'lpr'
    NEWS = 'news'
    UUCP = 'uucp'
    CRON = 'cron'
    AUTHPRIV = 'authpriv'
    FTP = 'ftp'
    NTP = 'ntp'
    AUDIT = 'audit'
    CONSOLE = 'console'
    SOLARIS_CRON = 'solaris-cron'
    LOCAL0 = 'local0'
    LOCAL1 = 'local1'
    LOCAL2 = 'local2'
    LOCAL3 = 'local3'
    LOCAL4 = 'local4'
    LOCAL5 = 'local5'
    LOCAL6 = 'local6'
    LOCAL7 = 'local7'

    @property
    def code(self) -> int:
        """Numeric code of the facility."""
        return SYSLOG_FACILITY_CODES[self]


SYSLOG_FACILITY_CODES: dict[SyslogFacility, int] = {
    facility: code for code, facility in enumerate(SyslogFacility)
}
"""Numeric code of each facility, in the order defined by the RFC."""


class SyslogSeverity(StrEnum):
    """Syslog severity name."""

    EMERG = 'emerg'
    ALERT = 'alert'
    CRIT = 'crit'
    ERR = 'err'
    WARNING = 'warning'
    NOTICE = 'notice'
    INFO = 'info'
    DEBUG = 'debug'

    @property
    def code(self) -> int:
        """Numeric code of the severity."""
        return SYSLOG_SEVERITY_CODES[self]


SYSLOG_SEVERITY_CODES: dict[SyslogSeverity, int] = {
    severity: code for code, severity in enumerate(SyslogSeverity)
}
"""Numeric code of each severity, in the order defined by the RFC."""

SYSLOG_SEVERITY_ALIASES: dict[str, str] = {
    'panic': SyslogSeverity.EMERG,
    'emergency': SyslogSeverity.EMERG,
    'critical': SyslogSeverity.CRIT,
    'error': SyslogSeverity.ERR,
    'warn': SyslogSeverity.WARNING,
    'information': SyslogSeverity.INFO,
    'informational': SyslogSeverity.INFO,
}
"""Severity spellings other log sources use for the canonical names."""


class SyslogMessageFormat(StrEnum):
    """Rendering of the event as the message part of a syslog line."""

    PLAIN = 'plain'
    JSON = 'json'


def is_printable_ascii(value: str) -> bool:
    """Check the value is only of characters a syslog header accepts.

    Parameters
    ----------
    value : str
        Value to check.

    Returns
    -------
    bool
        Whether every character of the value is a printable US-ASCII
        one, with the space excluded as a separator of header parts.

    """
    return bool(value) and all('!' <= char <= '~' for char in value)


def has_control_characters(value: str) -> bool:
    """Check the value carries a character that breaks a syslog line.

    Parameters
    ----------
    value : str
        Value to check.

    Returns
    -------
    bool
        Whether the value carries a control character, which would end
        the line or the frame it is written into.

    """
    return any(char < ' ' or char == '\x7f' for char in value)


def normalize_facility(value: Any) -> Any:
    """Bring a facility spelling to the canonical one."""
    if isinstance(value, str):
        return value.lower()

    return value


def normalize_severity(value: Any) -> Any:
    """Bring a severity spelling to the canonical one."""
    if isinstance(value, str):
        normalized = value.lower()
        return SYSLOG_SEVERITY_ALIASES.get(normalized, normalized)

    return value


type SyslogFacilityValue = (
    Annotated[SyslogFacility, BeforeValidator(normalize_facility)]
    | Annotated[int, Field(ge=0, le=23, strict=True)]
    | EventFieldRef
)

type SyslogSeverityValue = (
    Annotated[SyslogSeverity, BeforeValidator(normalize_severity)]
    | Annotated[int, Field(ge=0, le=7, strict=True)]
    | EventFieldRef
)

type SyslogHeaderPart = Literal['hostname', 'app_name', 'procid', 'msgid']

SYSLOG_HEADER_LIMITS: dict[SyslogHeaderPart, int] = {
    'hostname': 255,
    'app_name': 48,
    'procid': 128,
    'msgid': 32,
}
"""Length each header part is limited to by RFC 5424."""


class SyslogStructuredDataConfig(BaseModel, frozen=True, extra='forbid'):
    """Config of a single structured data element.

    Parameters
    ----------
    id : str
        Identifier of the element, e.g. `exampleSDID@32473`.

    params : dict[str, str | EventFieldRef], default={}
        Parameters of the element, each a static value or a reference
        to a field of the event. A referenced field that the event does
        not carry omits its parameter.

    """

    id: str = Field(min_length=1, max_length=32)
    params: dict[str, str | EventFieldRef] = Field(default_factory=dict)

    @field_validator('id')
    @classmethod
    def validate_id(cls, v: str) -> str:  # noqa: D102
        if not is_printable_ascii(v) or any(char in v for char in '="]'):
            msg = (
                'Structured data id must be of printable ASCII characters '
                'excluding `=`, `"`, `]` and space'
            )
            raise ValueError(msg)

        return v

    @field_validator('params')
    @classmethod
    def validate_params(  # noqa: D102
        cls,
        v: dict[str, str | EventFieldRef],
    ) -> dict[str, str | EventFieldRef]:
        for value in v.values():
            if isinstance(value, str) and has_control_characters(value):
                msg = (
                    'Structured data parameter value cannot carry a '
                    'control character'
                )
                raise ValueError(msg)

        for name in v:
            if (
                not is_printable_ascii(name)
                or any(char in name for char in '="]')
                or len(name) > 32  # noqa: PLR2004
            ):
                msg = (
                    'Structured data parameter name must be of at most 32 '
                    'printable ASCII characters excluding `=`, `"`, `]` '
                    'and space'
                )
                raise ValueError(msg)

        return v


class SyslogFormatterConfig(BaseFormatterConfig, frozen=True):
    """Config for syslog format.

    Parameters
    ----------
    format : Literal[Format.SYSLOG]
        Target format.

    rfc : SyslogRfc, default=SyslogRfc.RFC_5424
        Specification the message is built after.

    facility : SyslogFacilityValue, default=SyslogFacility.USER
        Facility as a name, a code or a reference to a field of the
        event.

    severity : SyslogSeverityValue, default=SyslogSeverity.INFO
        Severity as a name, a code or a reference to a field of the
        event.

    hostname : str | EventFieldRef, default='-'
        Host the message originates from.

    app_name : str | EventFieldRef, default='-'
        Application the message originates from. For RFC 3164 it is
        the tag of the message.

    procid : str | EventFieldRef, default='-'
        Process id of the application.

    msgid : str | EventFieldRef, default='-'
        Type of the message. RFC 5424 only.

    timestamp : EventFieldRef | None, default=None
        Field of the event carrying the time of the message. The time
        of writing is used when it is not set.

    structured_data : list[SyslogStructuredDataConfig], default=[]
        Structured data elements of the message. RFC 5424 only.

    message_field : str | None, default=None
        Field of the event carrying the message part. The event itself
        is the message when it is not set.

    message_format : SyslogMessageFormat, default='plain'
        Rendering of the event as the message part. Applies only when
        `message_field` is not set.

    bom : bool, default=False
        Whether to prepend the message part with the UTF-8 BOM that
        marks it as UTF-8 encoded. RFC 5424 only.

    """

    format: Literal[Format.SYSLOG]
    rfc: SyslogRfc = Field(default=SyslogRfc.RFC_5424)
    facility: SyslogFacilityValue = Field(default=SyslogFacility.USER)
    severity: SyslogSeverityValue = Field(default=SyslogSeverity.INFO)
    hostname: (
        Annotated[str, Field(max_length=SYSLOG_HEADER_LIMITS['hostname'])]
        | EventFieldRef
    ) = Field(default=SYSLOG_NILVALUE)
    app_name: (
        Annotated[str, Field(max_length=SYSLOG_HEADER_LIMITS['app_name'])]
        | EventFieldRef
    ) = Field(default=SYSLOG_NILVALUE)
    procid: (
        Annotated[str, Field(max_length=SYSLOG_HEADER_LIMITS['procid'])]
        | EventFieldRef
    ) = Field(default=SYSLOG_NILVALUE)
    msgid: (
        Annotated[str, Field(max_length=SYSLOG_HEADER_LIMITS['msgid'])]
        | EventFieldRef
    ) = Field(default=SYSLOG_NILVALUE)
    timestamp: EventFieldRef | None = Field(default=None)
    structured_data: list[SyslogStructuredDataConfig] = Field(
        default_factory=list,
    )
    message_field: str | None = Field(default=None, min_length=1)
    message_format: SyslogMessageFormat = Field(
        default=SyslogMessageFormat.PLAIN,
    )
    bom: bool = Field(default=False)

    @field_validator('structured_data')
    @classmethod
    def validate_structured_data(  # noqa: D102
        cls,
        v: list[SyslogStructuredDataConfig],
    ) -> list[SyslogStructuredDataConfig]:
        ids = [element.id for element in v]

        if len(ids) != len(set(ids)):
            msg = 'Structured data element ids must be unique'
            raise ValueError(msg)

        return v

    @field_validator('hostname', 'app_name', 'procid', 'msgid')
    @classmethod
    def validate_header_part(  # noqa: D102
        cls,
        v: str | EventFieldRef,
    ) -> str | EventFieldRef:
        if isinstance(v, EventFieldRef):
            return v

        if not is_printable_ascii(v):
            msg = (
                'Header part must be a non-empty value of printable ASCII '
                'characters with no space'
            )
            raise ValueError(msg)

        return v

    @model_validator(mode='after')
    def validate_rfc_support(self) -> Self:  # noqa: D102
        if self.rfc is not SyslogRfc.RFC_3164:
            return self

        unsupported = [
            name
            for name, is_set in {
                'msgid': self.msgid != SYSLOG_NILVALUE,
                'structured_data': bool(self.structured_data),
                'bom': self.bom,
            }.items()
            if is_set
        ]

        if unsupported:
            msg = 'Following fields are not a part of RFC 3164: ' + ', '.join(
                unsupported,
            )
            raise ValueError(msg)

        return self


_MONTHS = (
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
)
"""Month abbreviations of the RFC 3164 timestamp, which is in English
regardless of the locale of the machine.
"""

_BOM = '\ufeff'
"""Byte order mark that marks the message part as UTF-8 encoded."""

_UTC_OFFSET = '+00:00'
"""Offset an aware timestamp in UTC is rendered with."""

_MAX_FACILITY = 23
_MAX_SEVERITY = 7


@dataclass(frozen=True, slots=True)
class _MessageParts:
    """Parts a syslog message is assembled from."""

    pri: int
    timestamp: datetime
    hostname: str
    app_name: str
    procid: str
    msgid: str
    structured_data: str
    message: str


class SyslogRenderer:
    """Renderer of events as syslog messages.

    Parameters
    ----------
    config : SyslogFormatterConfig
        Config of the syslog formatter.

    """

    def __init__(self, config: SyslogFormatterConfig) -> None:
        """Initialize renderer."""
        self._config = config

        self._reads_event = (
            config.message_field is not None
            or config.timestamp is not None
            or any(
                isinstance(value, EventFieldRef)
                for value in (
                    config.facility,
                    config.severity,
                    config.hostname,
                    config.app_name,
                    config.procid,
                    config.msgid,
                )
            )
            or any(
                isinstance(value, EventFieldRef)
                for element in config.structured_data
                for value in element.params.values()
            )
        )

    def render(self, event: str) -> str:
        """Render event as a syslog message.

        Parameters
        ----------
        event : str
            Event to render.

        Returns
        -------
        str
            Syslog message.

        Raises
        ------
        FormatError
            If the event does not carry what the message requires.

        """
        data = self._decode(event) if self._reads_event else {}

        parts = _MessageParts(
            pri=self._resolve_pri(data, event),
            timestamp=self._resolve_timestamp(data, event),
            hostname=self._resolve_header_part(
                self._config.hostname,
                data,
                event,
                part='hostname',
            ),
            app_name=self._resolve_header_part(
                self._config.app_name,
                data,
                event,
                part='app_name',
            ),
            procid=self._resolve_header_part(
                self._config.procid,
                data,
                event,
                part='procid',
            ),
            msgid=self._resolve_header_part(
                self._config.msgid,
                data,
                event,
                part='msgid',
            ),
            structured_data=self._resolve_structured_data(data, event),
            message=self._resolve_message(data, event),
        )

        if self._config.rfc is SyslogRfc.RFC_3164:
            return _render_rfc3164(parts)

        return _render_rfc5424(parts)

    def _decode(self, event: str) -> dict[str, Any]:
        """Decode event as a JSON object.

        Raises
        ------
        FormatError
            If the event is not a JSON object.

        """
        try:
            data = msgspec.json.decode(event)
        except msgspec.DecodeError as e:
            msg = f'Cannot read fields of the event: {e}'
            raise FormatError(
                msg,
                original_event=event,
                kind=FormatErrorKind.SYSLOG_DECODE,
                report_reason='Cannot read fields of the event: invalid JSON',
            ) from None

        if not isinstance(data, dict):
            msg = 'Cannot read fields of the event: it is not a JSON object'
            raise FormatError(
                msg,
                original_event=event,
                kind=FormatErrorKind.SYSLOG_EVENT_TYPE,
            ) from None

        return data

    def _resolve_pri(self, data: dict[str, Any], event: str) -> int:
        """Resolve priority value of the message.

        Raises
        ------
        FormatError
            If facility or severity cannot be resolved.

        """
        facility = self._config.facility

        if isinstance(facility, EventFieldRef):
            facility_code = self._resolve_facility(
                lookup_field(data, facility.field),
                field=facility.field,
                event=event,
            )
        elif isinstance(facility, SyslogFacility):
            facility_code = facility.code
        else:
            facility_code = facility

        severity = self._config.severity

        if isinstance(severity, EventFieldRef):
            severity_code = self._resolve_severity(
                lookup_field(data, severity.field),
                field=severity.field,
                event=event,
            )
        elif isinstance(severity, SyslogSeverity):
            severity_code = severity.code
        else:
            severity_code = severity

        return facility_code * 8 + severity_code

    def _resolve_facility(
        self,
        value: Any,
        field: str,
        event: str,
    ) -> int:
        """Resolve facility code taken from the event.

        Raises
        ------
        FormatError
            If the value is not a facility.

        """
        if isinstance(value, int) and not isinstance(value, bool):
            if 0 <= value <= _MAX_FACILITY:
                return value
        elif isinstance(value, str):
            if value.isdigit():
                if int(value) <= _MAX_FACILITY:
                    return int(value)
            else:
                try:
                    return SyslogFacility(normalize_facility(value)).code
                except ValueError:
                    pass

        msg = f'Field `{field}` does not hold a syslog facility'
        raise FormatError(
            msg,
            original_event=event,
            kind=FormatErrorKind.SYSLOG_FACILITY,
            source=field,
        )

    def _resolve_severity(
        self,
        value: Any,
        field: str,
        event: str,
    ) -> int:
        """Resolve severity code taken from the event.

        Raises
        ------
        FormatError
            If the value is not a severity.

        """
        if isinstance(value, int) and not isinstance(value, bool):
            if 0 <= value <= _MAX_SEVERITY:
                return value
        elif isinstance(value, str):
            if value.isdigit():
                if int(value) <= _MAX_SEVERITY:
                    return int(value)
            else:
                try:
                    return SyslogSeverity(normalize_severity(value)).code
                except ValueError:
                    pass

        msg = f'Field `{field}` does not hold a syslog severity'
        raise FormatError(
            msg,
            original_event=event,
            kind=FormatErrorKind.SYSLOG_SEVERITY,
            source=field,
        )

    def _resolve_timestamp(
        self,
        data: dict[str, Any],
        event: str,
    ) -> datetime:
        """Resolve time of the message.

        Raises
        ------
        FormatError
            If the referenced field does not hold a time.

        """
        reference = self._config.timestamp

        if reference is None:
            return datetime.now().astimezone()

        value = lookup_field(data, reference.field)

        if isinstance(value, str):
            try:
                timestamp = datetime.fromisoformat(value)
            except ValueError:
                msg = (
                    f'Field `{reference.field}` does not hold a time in '
                    f'ISO 8601 format'
                )
                raise FormatError(
                    msg,
                    original_event=event,
                    kind=FormatErrorKind.SYSLOG_TIMESTAMP_ISO,
                    source=reference.field,
                ) from None
        elif isinstance(value, int | float) and not isinstance(value, bool):
            try:
                timestamp = datetime.fromtimestamp(value, tz=UTC)
            except ValueError, OverflowError, OSError:
                msg = (
                    f'Field `{reference.field}` does not hold a time in '
                    f'seconds since the epoch'
                )
                raise FormatError(
                    msg,
                    original_event=event,
                    kind=FormatErrorKind.SYSLOG_TIMESTAMP_EPOCH,
                    source=reference.field,
                ) from None
        else:
            msg = f'Field `{reference.field}` does not hold a time'
            raise FormatError(
                msg,
                original_event=event,
                kind=FormatErrorKind.SYSLOG_TIMESTAMP_TYPE,
                source=reference.field,
            )

        if timestamp.tzinfo is None:
            return timestamp.astimezone()

        return timestamp

    def _resolve_header_part(
        self,
        value: str | EventFieldRef,
        data: dict[str, Any],
        event: str,
        part: SyslogHeaderPart,
    ) -> str:
        """Resolve a header part of the message.

        Raises
        ------
        FormatError
            If the referenced field holds a value no header part can
            carry.

        """
        if not isinstance(value, EventFieldRef):
            return value

        raw = lookup_field(data, value.field)

        if raw is None:
            return SYSLOG_NILVALUE

        text = self._as_text(raw, field=value.field, event=event)

        if not text:
            return SYSLOG_NILVALUE

        if not is_printable_ascii(text):
            msg = (
                f'Field `{value.field}` holds a value with characters no '
                f'syslog header part can carry'
            )
            raise FormatError(
                msg,
                original_event=event,
                kind=FormatErrorKind.SYSLOG_HEADER_CHARACTERS,
                source=part,
            )

        if len(text) > SYSLOG_HEADER_LIMITS[part]:
            msg = (
                f'Field `{value.field}` holds a value longer than the '
                f'{SYSLOG_HEADER_LIMITS[part]} characters `{part}` carries'
            )
            raise FormatError(
                msg,
                original_event=event,
                kind=FormatErrorKind.SYSLOG_HEADER_LENGTH,
                source=part,
            )

        return text

    def _resolve_structured_data(
        self,
        data: dict[str, Any],
        event: str,
    ) -> str:
        """Resolve structured data of the message.

        Raises
        ------
        FormatError
            If a referenced field holds a value no parameter can carry.

        """
        if not self._config.structured_data:
            return SYSLOG_NILVALUE

        return ''.join(
            self._render_structured_data_element(element, data, event)
            for element in self._config.structured_data
        )

    def _render_structured_data_element(
        self,
        element: SyslogStructuredDataConfig,
        data: dict[str, Any],
        event: str,
    ) -> str:
        """Render a single structured data element."""
        parts = [element.id]

        for name, value in element.params.items():
            if isinstance(value, EventFieldRef):
                raw = lookup_field(data, value.field)

                if raw is None:
                    continue

                text = self._as_text(raw, field=value.field, event=event)

                if has_control_characters(text):
                    msg = (
                        f'Field `{value.field}` holds a value with a '
                        f'control character, which would end the message '
                        f'it is written into'
                    )
                    raise FormatError(
                        msg,
                        original_event=event,
                        kind=(FormatErrorKind.SYSLOG_STRUCTURED_DATA_CONTROL),
                        source=value.field,
                    )
            else:
                text = value

            parts.append(f'{name}="{_escape_param_value(text)}"')

        return f'[{" ".join(parts)}]'

    def _resolve_message(self, data: dict[str, Any], event: str) -> str:
        """Resolve message part of the message.

        Raises
        ------
        FormatError
            If the message part cannot be built from the event.

        """
        config = self._config

        if config.message_field is not None:
            value = lookup_field(data, config.message_field)

            if value is None:
                msg = f'Event does not carry field `{config.message_field}`'
                raise FormatError(
                    msg,
                    original_event=event,
                    kind=FormatErrorKind.SYSLOG_MESSAGE_FIELD,
                    source=config.message_field,
                )

            message = (
                value
                if isinstance(value, str)
                else msgspec.json.encode(value).decode()
            )
        elif config.message_format is SyslogMessageFormat.JSON:
            try:
                message = msgspec.json.format(event, indent=-1)
            except msgspec.DecodeError as e:
                msg = f'Cannot render event as JSON message: {e}'
                raise FormatError(
                    msg,
                    original_event=event,
                    kind=FormatErrorKind.SYSLOG_JSON_MESSAGE,
                    report_reason='Cannot render event as JSON message',
                ) from None
        else:
            message = event

        if config.bom:
            return f'{_BOM}{message}'

        return message

    def _as_text(
        self,
        value: Any,
        field: str,
        event: str,
    ) -> str:
        """Render a scalar value taken from the event as text.

        Raises
        ------
        FormatError
            If the value is not a scalar one.

        """
        if isinstance(value, str):
            return value

        if isinstance(value, bool):
            return 'true' if value else 'false'

        if isinstance(value, int | float):
            return str(value)

        msg = f'Field `{field}` holds a value that is not a scalar one'
        raise FormatError(
            msg,
            original_event=event,
            kind=FormatErrorKind.SYSLOG_SCALAR,
            source=field,
        )


def _render_rfc5424(parts: _MessageParts) -> str:
    """Render message parts as an RFC 5424 message."""
    timestamp = parts.timestamp.isoformat()

    if timestamp.endswith(_UTC_OFFSET):
        timestamp = f'{timestamp[: -len(_UTC_OFFSET)]}Z'

    line = (
        f'<{parts.pri}>1 {timestamp} {parts.hostname} {parts.app_name} '
        f'{parts.procid} {parts.msgid} {parts.structured_data}'
    )

    if parts.message:
        return f'{line} {parts.message}'

    return line


def _render_rfc3164(parts: _MessageParts) -> str:
    """Render message parts as an RFC 3164 message."""
    timestamp = parts.timestamp
    rendered_timestamp = (
        f'{_MONTHS[timestamp.month - 1]} {timestamp.day:2d} '
        f'{timestamp:%H:%M:%S}'
    )

    line = f'<{parts.pri}>{rendered_timestamp} {parts.hostname}'

    if parts.app_name != SYSLOG_NILVALUE:
        line = (
            f'{line} {parts.app_name}:'
            if parts.procid == SYSLOG_NILVALUE
            else f'{line} {parts.app_name}[{parts.procid}]:'
        )

    if parts.message:
        return f'{line} {parts.message}'

    return line


def _escape_param_value(value: str) -> str:
    """Escape the characters a structured data value cannot carry."""
    return value.replace('\\', '\\\\').replace('"', '\\"').replace(']', '\\]')
