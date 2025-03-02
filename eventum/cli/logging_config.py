import logging
import logging.config
import logging.handlers
import os
from typing import Literal, TypeAlias, assert_never

import structlog

LogLevel: TypeAlias = Literal['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']


def disable() -> None:
    logging.disable()
    structlog.configure(processors=[])


def direct_to_stderr(level: LogLevel = 'DEBUG') -> None:
    logging.config.dictConfig({
        'version': 1,
        'formatters': {
            'stderr-formatter': {
                '()': structlog.stdlib.ProcessorFormatter,
                'processor': structlog.dev.ConsoleRenderer(colors=True),
            },
        },
        'handlers': {
            'stderr': {
                'level': level,
                'formatter': 'stderr-formatter',
                'class': 'logging.StreamHandler',
                'stream': 'ext://sys.stderr',
            }
        },
        'loggers': {
            '': {
                'handlers': ['stderr'],
                'level': 'DEBUG',
                'propagate': True,
            },
        }
    })

    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def configure_for_stderr_and_file(
    format: Literal['plain', 'json'],
    level: LogLevel,
    logs_dir: str,
    log_basename: str
) -> None:
    match format:
        case 'json':
            extension = 'json'
        case 'plain':
            extension = 'log'
        case f:
            assert_never(f)

    log_path = os.path.join(logs_dir, f'{log_basename}.{extension}')

    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir, exist_ok=True)

    logging.config.dictConfig({
        'version': 1,
        'formatters': {
            'file-formatter': {
                '()': structlog.stdlib.ProcessorFormatter,
                'processor': structlog.dev.ConsoleRenderer(colors=False)
            },
            'stderr-formatter': {
                '()': structlog.stdlib.ProcessorFormatter,
                'processor': structlog.dev.ConsoleRenderer(colors=True),
            },
        },
        'handlers': {
            'stderr': {
                'level': level,
                'formatter': 'stderr-formatter',
                'class': 'logging.StreamHandler',
                'stream': 'ext://sys.stderr',
            },
            'file': {
                'level': level,
                'class': 'logging.handlers.WatchedFileHandler',
                'filename': log_path,
                'formatter': 'file-formatter',
            },
        },
        'loggers': {
            '': {
                'handlers': ['stderr', 'file'],
                'level': 'DEBUG',
                'propagate': True,
            },
        }
    })
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt='iso', utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
