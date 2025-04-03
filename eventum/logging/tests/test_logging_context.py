from threading import Thread

import pytest
import structlog

from eventum.logging.context import propagate_logger_context

logger = structlog.stdlib.get_logger()


@pytest.fixture(autouse=True)
def clear_handlers():
    structlog.contextvars.clear_contextvars()
    yield
    structlog.contextvars.clear_contextvars()


def test_propagate_logging_context_with_default():
    def work():
        assert structlog.contextvars.get_contextvars() == {'var': 'value'}

    structlog.contextvars.bind_contextvars(var='value')

    thread = Thread(target=propagate_logger_context()(work))
    thread.start()
    thread.join()


def test_propagate_logging_context_with_defined():
    def work():
        assert structlog.contextvars.get_contextvars() == {'other': 'val'}

    structlog.contextvars.bind_contextvars(var='value')

    thread = Thread(
        target=propagate_logger_context(context={'other': 'val'})(work)
    )
    thread.start()
    thread.join()
