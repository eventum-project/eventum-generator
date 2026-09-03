"""OTLP/HTTP exporter."""

import ssl

import httpx
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
    ExportLogsServiceRequest,
)

from eventum.plugins.output.http_client import create_client
from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.otlp.exporters.base import (
    ExportFailure,
    ExportResult,
)

PROTOBUF_CONTENT_TYPE = 'application/x-protobuf'


class HttpExporter:
    """Exporter delivering requests over OTLP/HTTP.

    Notes
    -----
    Implements the `Exporter` protocol structurally.

    """

    def __init__(
        self,
        config: OtlpOutputPluginConfig,
        ssl_context: ssl.SSLContext,
        url: str,
    ) -> None:
        """Initialize exporter.

        Parameters
        ----------
        config : OtlpOutputPluginConfig
            Configuration of the plugin.

        ssl_context : ssl.SSLContext
            Context for TLS connections.

        url : str
            Full URL of the logs endpoint.

        """
        self._config = config
        self._ssl_context = ssl_context
        self._url = url
        self._client: httpx.AsyncClient

    async def open(self) -> None:
        """Acquire the resources of the transport."""
        self._client = create_client(
            ssl_context=self._ssl_context,
            headers={
                **self._config.headers,
                'Content-Type': PROTOBUF_CONTENT_TYPE,
            },
            connect_timeout=self._config.connect_timeout,
            request_timeout=self._config.request_timeout,
            proxy_url=(
                str(self._config.proxy_url) if self._config.proxy_url else None
            ),
        )

    async def close(self) -> None:
        """Release the resources of the transport."""
        await self._client.aclose()

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
        return request.SerializeToString()

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
            Result of the delivery: `accepted` equals `records` on a
            successful response, `failure` is populated and nothing is
            counted as accepted on a transport error or an
            unsuccessful response.

        """
        try:
            response = await self._client.post(self._url, content=body)
        except httpx.RequestError as e:
            return ExportResult(
                accepted=0,
                rejected=0,
                failure=ExportFailure(
                    message='Request to OTLP receiver failed',
                    context={'reason': str(e), 'url': self._url},
                ),
            )

        if response.is_success:
            return ExportResult(accepted=records)

        content = await response.aread()

        return ExportResult(
            accepted=0,
            rejected=0,
            failure=ExportFailure(
                message='OTLP receiver returned an error',
                context={
                    'http_status': response.status_code,
                    'reason': content.decode(errors='replace')[:500],
                    'url': self._url,
                },
            ),
        )
