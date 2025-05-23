"""API parameters."""

from pathlib import Path
from typing import Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator


class SSLParameters(BaseModel, extra='forbid', frozen=True):
    """SSL parameters.

    Attributes
    ----------
    enabled : bool, default=True
        Whether to enable SSL.

    verify_mode : Literal['none', 'optional', 'required'], default='optional'
        Verification mode of SSL connections.

    ca_cert: Path | None, default=None
        Absolute path to CA certificate.

    cert: Path | None, default=None
        Absolute path to server certificate.

    cert_key: Path | None, default=None
        Absolute path to server certificate key.

    """

    enabled: bool = Field(default=True, description='Whether to enable SSL')
    verify_mode: Literal['none', 'optional', 'required'] = Field(
        default='optional',
    )
    ca_cert: Path | None = Field(default=None)
    cert: Path | None = Field(default=None)
    cert_key: Path | None = Field(default=None)

    @field_validator('ca_cert', 'cert', 'cert_key')
    @classmethod
    def validate_absolute_paths(cls, v: Path | None) -> Path | None:  # noqa: D102
        if not isinstance(v, str):
            return v

        if not v.is_absolute():
            msg = 'Path must be absolute'
            raise ValueError(msg)

        return v

    @model_validator(mode='after')
    def validate_client_cert(self) -> Self:  # noqa: D102
        if self.cert is None and self.cert_key is None:
            return self

        if self.cert is None or self.cert_key is None:
            msg = 'Server certificate and key must be provided together'
            raise ValueError(
                msg,
            )

        return self


class APIParameters(BaseModel, extra='forbid', frozen=True):
    """API parameters.

    Attributes
    ----------
    enabled : bool, default = True
        Whether to enable REST API.

    host : str, default='0.0.0.0'
        Bind address for API.

    port : int, default=9474
        Bind port for API,

    ssl : SSLParameters, default=SSLParameters(...)
        SSL parameters.

    """

    enabled: bool = Field(default=True)
    host: str = Field(default='0.0.0.0', min_length=1)  # noqa: S104
    port: int = Field(default=9474, ge=1)
    ssl: SSLParameters = Field(default_factory=lambda: SSLParameters())
