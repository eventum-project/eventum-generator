"""Custom handlers for logging system."""

import logging
from collections.abc import Callable
from typing import override

from lru import LRU


class RoutingHandler(logging.Handler):
    """Handler that routes logs to different handlers based on value of
    specific log record attribute.
    """

    def __init__(
        self,
        attribute: str,
        handler_factory: Callable[[str | None], logging.Handler],
        default_handler: logging.Handler,
        formatter: logging.Formatter,
    ) -> None:
        """Initialize routing handler.

        Parameters
        ----------
        attribute : str
            Name of log record attribute to use for routing

        handler_factory : Callable[[str | None], logging.Handler]
            Factory for creating new handlers (each for unique value of
            specified log record attribute), attribute value is passed to
            factory function as single argument

        default_handler : logging.Handler
            Handler that is used when log record attribute is missing

        formatter: logging.Formatter
            Formatter that will be used for created handlers

        """
        super().__init__()
        self._attribute = attribute
        self._handler_factory = handler_factory
        self._default_handler = default_handler
        self._formatter = formatter

        self._handlers: LRU[str, logging.Handler] = LRU(size=1024)

    @override
    def emit(self, record: logging.LogRecord) -> None:
        attr_value = getattr(record, self._attribute, None)

        if attr_value is None:
            self._default_handler.emit(record)
        elif attr_value in self._handlers:
            self._handlers[attr_value].emit(record)
        else:
            handler = self._handler_factory(attr_value)
            handler.setFormatter(self._formatter)
            self._handlers[attr_value] = handler

            handler.emit(record)
