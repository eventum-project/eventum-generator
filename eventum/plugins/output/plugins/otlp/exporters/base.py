"""Definition of the OTLP exporter interface."""

from dataclasses import dataclass, field
from typing import Any, Protocol

from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
    ExportLogsServiceRequest,
)


@dataclass(frozen=True, slots=True)
class ExportFailure:
    """Failure of a single export request.

    Attributes
    ----------
    message : str
        Message describing the failure.

    context : dict[str, Any]
        Context of the failure, keys follow `LOGGING.md`.

    """

    message: str
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ExportResult:
    """Result of a single export request.

    Attributes
    ----------
    accepted : int
        Number of records the receiver accepted.

    rejected : int
        Number of records the receiver rejected.

    failure : ExportFailure | None
        Failure of the request, `None` when the request succeeded.

    """

    accepted: int
    rejected: int = 0
    failure: ExportFailure | None = None


class Exporter(Protocol):
    """Transport delivering OTLP export requests."""

    async def open(self) -> None:
        """Acquire the resources of the transport."""
        ...

    async def close(self) -> None:
        """Release the resources of the transport."""
        ...

    def encode(self, request: ExportLogsServiceRequest) -> bytes:
        """Serialize request to the body of a single delivery.

        Parameters
        ----------
        request : ExportLogsServiceRequest
            Request to serialize.

        Returns
        -------
        bytes
            Serialized body of the request.

        Notes
        -----
        Called from a worker thread, since serialization is CPU bound.

        """
        ...

    async def send(self, body: bytes, records: int) -> ExportResult:
        """Deliver an encoded request carrying `records` records.

        Parameters
        ----------
        body : bytes
            Serialized body of the request to send.

        records : int
            Number of records the request carries.

        Returns
        -------
        ExportResult
            Result of the delivery.

        """
        ...
