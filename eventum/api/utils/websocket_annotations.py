"""Utils for documenting websocket routes using Annotated."""

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, kw_only=True)
class AsyncAPIMessage:
    """Async API Message object.

    Notes
    -----
    Fields description: https://www.asyncapi.com/docs/reference/specification/v3.0.0#messageObject

    """

    name: str
    title: str
    summary: str = ''
    description: str = ''
    contentType: str  # noqa: N815
    headers: dict[str, Any] = field(default_factory=dict)
    payload: dict[str, Any] = field(default_factory=dict)
    correlationId: dict[str, Any] = field(default_factory=dict)  # noqa: N815
    tags: list[dict[str, Any]] = field(default_factory=list)
    externalDocs: dict[str, Any] = field(default_factory=dict)  # noqa: N815
    bindings: dict[str, Any] = field(default_factory=dict)
    examples: list[dict[str, Any]] = field(default_factory=list)
    traits: list[dict[str, Any]] = field(default_factory=list)


@dataclass(frozen=True, kw_only=True)
class AsyncAPIOperationSpecifiable:
    """Async API Operation object except those fields that are
    generated dynamically for an annotated endpoint.

    Notes
    -----
    Fields description: https://www.asyncapi.com/docs/reference/specification/v3.0.0#operationObject

    """

    summary: str = ''
    description: str = ''
    security: list[dict[str, Any]] = field(default_factory=list)
    tags: list[dict[str, Any]] = field(default_factory=list)
    externalDocs: dict[str, Any] = field(default_factory=dict)  # noqa: N815
    traits: list[dict[str, Any]] = field(default_factory=list)
    reply: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, kw_only=True)
class Receives(AsyncAPIOperationSpecifiable):
    """Information about websocket that implements receive operation."""

    message: AsyncAPIMessage  # type: ignore[misc]


@dataclass(frozen=True, kw_only=True)
class Sends(AsyncAPIOperationSpecifiable):
    """Information about websocket that implements send operation."""

    message: AsyncAPIMessage  # type: ignore[misc]


@dataclass(frozen=True, kw_only=True)
class Rejects:
    """Information about websocket that rejects client connection."""

    status_code: int
    details: str
