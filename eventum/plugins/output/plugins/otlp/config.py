"""Definition of otlp output plugin config."""

from pathlib import Path
from typing import Literal, Self

from pydantic import Field, HttpUrl, field_validator, model_validator

from eventum.plugins.output.base.config import OutputPluginConfig
from eventum.plugins.output.fields import (
    Format,
    FormatterConfigT,
    SimpleFormatterConfig,
)

BATCH_FORMATS = frozenset(
    {
        Format.JSON_BATCH,
        Format.TEMPLATE_BATCH,
        Format.EVENTUM_HTTP_INPUT,
    },
)


class OtlpOutputPluginConfig(OutputPluginConfig, frozen=True):
    """Configuration for `otlp` output plugin.

    Attributes
    ----------
    endpoint : HttpUrl
        Address of the OTLP receiver, `/v1/logs` is appended when the
        address carries no path.

    protocol : Literal['http/protobuf', 'http/json']
        Wire encoding of the request body, `'http/protobuf'` by
        default.

    compression : Literal['none', 'gzip'], default='none'
        Compression applied to the request body.

    headers : dict[str, str], default={}
        Extra request headers. A `Content-Type` or `Content-Encoding`
        entry is overridden, since both are dictated by `protocol`
        and `compression`.

    connect_timeout : int, default=10
        Connection timeout in seconds.

    request_timeout : int, default=300
        Request timeout in seconds.

    verify : bool, default=True
        Whether to verify SSL certificate of the receiver.

    ca_cert : Path | None, default=None
        Path to CA certificate.

    client_cert : Path | None, default=None
        Path to client certificate.

    client_cert_key : Path | None, default=None
        Path to client certificate key.

    proxy_url : HttpUrl | None, default=None
        HTTP(S) proxy address.

    timestamp_field : str | None, default='@timestamp'
        Dotted path of the event field carrying the record time.
        `None` means the time of writing is always used.

    severity_field : str | None, default='log.level'
        Dotted path of the event field carrying the record severity.
        `None` means no severity is read from the event.

    resource_attributes : dict[str, str | int | float | bool]
        Static attributes added to every resource, empty by default.
        Overrides the default `service.name` and `telemetry.sdk.*`
        attributes when a key collides.

    resource_attributes_from : dict[str, str], default={}
        Resource attribute name mapped to the dotted path of the
        event field whose value is lifted into it. Records are
        grouped into one resource per distinct combination of
        lifted values.

    body_field : str | None, default=None
        Dotted path of the event field carrying the record body.
        `None` means the whole event is always used as the body. A
        field that is absent or `null` falls back to the whole
        event.

    flatten_attributes : bool, default=True
        Whether to flatten nested objects into dotted attribute
        keys, `False` keeps their nested shape.

    max_request_bytes : int, default=4194304
        Approximate byte budget of a single request, records of one
        write are split across several requests to stay within it.
        Must be at least 1024.

    Notes
    -----
    Events are mapped to log records one by one, so formatters that
    aggregate a batch into a single string are not accepted.

    """

    endpoint: HttpUrl
    protocol: Literal['http/protobuf', 'http/json'] = Field(
        default='http/protobuf',
    )
    compression: Literal['none', 'gzip'] = Field(default='none')
    headers: dict[str, str] = Field(default_factory=dict)
    connect_timeout: int = Field(default=10, ge=1)
    request_timeout: int = Field(default=300, ge=1)
    verify: bool = Field(default=True)
    ca_cert: Path | None = Field(default=None)
    client_cert: Path | None = Field(default=None)
    client_cert_key: Path | None = Field(default=None)
    proxy_url: HttpUrl | None = Field(default=None)
    timestamp_field: str | None = Field(default='@timestamp', min_length=1)
    severity_field: str | None = Field(default='log.level', min_length=1)
    resource_attributes: dict[str, str | int | float | bool] = Field(
        default_factory=dict,
    )
    resource_attributes_from: dict[str, str] = Field(default_factory=dict)
    body_field: str | None = Field(default=None, min_length=1)
    flatten_attributes: bool = Field(default=True)
    max_request_bytes: int = Field(default=4 * 1024 * 1024, ge=1024)
    formatter: FormatterConfigT = Field(
        default_factory=lambda: SimpleFormatterConfig(format=Format.PLAIN),
        validate_default=True,
        discriminator='format',
    )

    @field_validator('resource_attributes_from')
    @classmethod
    def validate_resource_attributes_from(  # noqa: D102
        cls,
        v: dict[str, str],
    ) -> dict[str, str]:
        if any(not path for path in v.values()):
            msg = 'Resource attribute path must not be empty'
            raise ValueError(msg)

        return v

    @model_validator(mode='after')
    def validate_client_cert(self) -> Self:  # noqa: D102
        if self.client_cert is None and self.client_cert_key is None:
            return self

        if self.client_cert is None or self.client_cert_key is None:
            msg = 'Client certificate and key must be provided together'
            raise ValueError(msg)

        return self

    @model_validator(mode='after')
    def validate_formatter(self) -> Self:  # noqa: D102
        if self.formatter.format in BATCH_FORMATS:
            msg = (
                'Formatter producing a single string for the whole batch '
                'cannot be used, since every event becomes its own record'
            )
            raise ValueError(msg)

        return self
