"""OTLP/HTTP exporter."""

import gzip
import ssl
from collections.abc import Mapping
from typing import Any

import httpx
from google.protobuf import json_format
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import (
    ExportLogsServiceRequest,
    ExportLogsServiceResponse,
)

from eventum.plugins.output.exceptions import PluginOpenError
from eventum.plugins.output.http_auth import (
    AuthenticationError,
    HttpAuthenticator,
    HttpAuthenticatorParams,
    create_authenticator,
)
from eventum.plugins.output.http_client import create_client
from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.otlp.exporters.base import (
    ExportFailure,
    ExportResult,
)

PROTOBUF_CONTENT_TYPE = 'application/x-protobuf'
JSON_CONTENT_TYPE = 'application/json'
GZIP_CONTENT_ENCODING = 'gzip'
_UNAUTHORIZED_STATUS = 401


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
        self._headers: dict[str, str]
        self._authenticator: HttpAuthenticator[Any] | None = None

    async def open(self) -> None:
        """Acquire the resources of the transport.

        Raises
        ------
        PluginOpenError
            If credentials cannot be acquired.

        """
        content_type = (
            JSON_CONTENT_TYPE
            if self._config.protocol == 'http/json'
            else PROTOBUF_CONTENT_TYPE
        )
        managed_headers = {'content-type', 'content-encoding'}
        headers = {
            key: value
            for key, value in self._config.headers.items()
            if key.lower() not in managed_headers
        }
        headers['Content-Type'] = content_type

        if self._config.compression == 'gzip':
            headers['Content-Encoding'] = GZIP_CONTENT_ENCODING

        self._headers = headers

        # the configured and computed headers address the receiver of
        # this plugin, so they travel the requests to it rather than
        # the client the authenticator also reaches its own endpoint
        # through
        self._client = create_client(
            ssl_context=self._ssl_context,
            headers={},
            connect_timeout=self._config.connect_timeout,
            request_timeout=self._config.request_timeout,
            proxy_url=(
                str(self._config.proxy_url) if self._config.proxy_url else None
            ),
        )

        if self._config.auth is not None:
            # the plugin is not opened, so `close` never runs and the
            # client would be left behind
            try:
                self._authenticator = create_authenticator(
                    config=self._config.auth,
                    params=HttpAuthenticatorParams(client=self._client),
                )
                await self._authenticator.open()
            except AuthenticationError as e:
                await self._client.aclose()

                msg = 'Failed to authenticate'
                raise PluginOpenError(msg, context=e.context) from None
            except BaseException:
                await self._client.aclose()
                raise

    async def close(self) -> None:
        """Release the resources of the transport."""
        if self._authenticator is not None:
            await self._authenticator.close()

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
        if self._config.protocol == 'http/json':
            body = json_format.MessageToJson(request, indent=None).encode()
        else:
            body = request.SerializeToString()

        if self._config.compression == 'gzip':
            return gzip.compress(body)

        return body

    def _read_partial_success(self, content: bytes) -> tuple[int, str, bool]:
        """Read the partial success reported in a response body.

        Parameters
        ----------
        content : bytes
            Body of a successful response.

        Returns
        -------
        tuple[int, str, bool]
            Number of records the receiver rejected, the partial
            success message reported for them, and whether the body
            could not be parsed. `(0, '', False)` for an empty body,
            since a 2xx response with no body reports no partial
            failure. `(0, '', True)` for a non-empty body that fails
            to parse, since a 2xx response has taken the records
            regardless of whether its body can be read.

        """
        if not content:
            return 0, '', False

        response = ExportLogsServiceResponse()

        try:
            if self._config.protocol == 'http/json':
                json_format.Parse(content.decode(), response)
            else:
                response.ParseFromString(content)
        except Exception:  # noqa: BLE001
            return 0, '', True

        return (
            response.partial_success.rejected_log_records,
            response.partial_success.error_message,
            False,
        )

    async def _send_once(
        self,
        body: bytes,
    ) -> tuple[httpx.Response, Mapping[str, str]] | ExportFailure:
        """Send a single request with authentication applied.

        Parameters
        ----------
        body : bytes
            Serialized body of the request to send.

        Returns
        -------
        tuple[httpx.Response, Mapping[str, str]] | ExportFailure
            Response of the receiver, of any status code, and the
            authentication headers the request carried; an
            `ExportFailure` instead when credentials could not be
            acquired or the request could not be sent.

        """
        credentials: Mapping[str, str] = {}

        if self._authenticator is not None:
            try:
                credentials = await self._authenticator.headers()
            except AuthenticationError as e:
                return ExportFailure(
                    message='Failed to authenticate',
                    context=e.context,
                )

        try:
            response = await self._client.post(
                self._url,
                content=body,
                headers=self._headers | dict(credentials),
            )
        except httpx.RequestError as e:
            return ExportFailure(
                message='Request to OTLP receiver failed',
                context={'reason': str(e), 'url': self._url},
            )

        return response, credentials

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
            Result of the delivery: on a successful response,
            `accepted` and `rejected` split `records` according to
            the partial success the receiver reported (none of it
            when the response carries none); `failure` is populated
            and nothing is counted as accepted on a transport error,
            a failure to authenticate, or an unsuccessful response.

        Notes
        -----
        A response rejected as unauthorized is given one more
        attempt with refreshed credentials, exactly once.

        """
        result = await self._send_once(body)

        if isinstance(result, ExportFailure):
            return ExportResult(accepted=0, rejected=0, failure=result)

        response, sent = result

        if (
            not response.is_success
            and response.status_code == _UNAUTHORIZED_STATUS
            and self._authenticator is not None
            and await self._authenticator.handle_unauthorized(sent)
        ):
            result = await self._send_once(body)

            if isinstance(result, ExportFailure):
                return ExportResult(accepted=0, rejected=0, failure=result)

            response, sent = result

        if response.is_success:
            content = await response.aread()
            rejected, message, body_unparsable = self._read_partial_success(
                content
            )
            rejected = min(max(rejected, 0), records)

            return ExportResult(
                accepted=records - rejected,
                rejected=rejected,
                message=message,
                body_unparsable=body_unparsable,
            )

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
