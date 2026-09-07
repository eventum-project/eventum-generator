"""Exceptions used across output plugins."""

from enum import StrEnum

from eventum.plugins.exceptions import PluginError


class FormatErrorKind(StrEnum):
    """Stable categories of output formatting failures."""

    GENERIC = 'generic'
    JSON_DECODE = 'json_decode'
    TEMPLATE_RENDER = 'template_render'
    SYSLOG_DECODE = 'syslog_decode'
    SYSLOG_EVENT_TYPE = 'syslog_event_type'
    SYSLOG_FACILITY = 'syslog_facility'
    SYSLOG_SEVERITY = 'syslog_severity'
    SYSLOG_TIMESTAMP_ISO = 'syslog_timestamp_iso'
    SYSLOG_TIMESTAMP_EPOCH = 'syslog_timestamp_epoch'
    SYSLOG_TIMESTAMP_TYPE = 'syslog_timestamp_type'
    SYSLOG_HEADER_CHARACTERS = 'syslog_header_characters'
    SYSLOG_HEADER_LENGTH = 'syslog_header_length'
    SYSLOG_STRUCTURED_DATA_CONTROL = 'syslog_structured_data_control'
    SYSLOG_MESSAGE_FIELD = 'syslog_message_field'
    SYSLOG_JSON_MESSAGE = 'syslog_json_message'
    SYSLOG_SCALAR = 'syslog_scalar'


class FormatError(Exception):
    """Exception for formatting errors."""

    def __init__(
        self,
        *args: object,
        original_event: str | None = None,
        kind: FormatErrorKind = FormatErrorKind.GENERIC,
        source: str | None = None,
        report_reason: str | None = None,
        rejected_count: int = 1,
    ) -> None:
        """Initialize error.

        Parameters
        ----------
        *args: object
            Exceptions arguments.

        original_event : str | None, default=None
            Original event.

        kind : FormatErrorKind, default=FormatErrorKind.GENERIC
            Stable failure category used to aggregate reports.

        source : str | None, default=None
            Stable formatter input that distinguishes failures within
            the same category.

        report_reason : str | None, default=None
            Stable reason used in aggregated log records. Defaults to
            the exception message.

        rejected_count : int, default=1
            Number of events rejected by this error.

        """
        super().__init__(*args)
        self.original_event = original_event
        self.kind = kind
        self.source = source
        self.report_reason = report_reason or str(self)
        self.rejected_count = rejected_count


class PluginOpenError(PluginError):
    """Error during opening plugin."""


class PluginWriteError(PluginError):
    """Events cannot be written."""
