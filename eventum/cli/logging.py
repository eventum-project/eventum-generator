import logging
import logging.config
import logging.handlers
from typing import Literal, TypeAlias

import structlog

LogLevel: TypeAlias = Literal['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']


def configure_for_cli(
    level: LogLevel = 'DEBUG',
    disable: bool = False
) -> None:
    if disable:
        logging.disable()
    else:
        logging.config.dictConfig({
            'version': 1,
            'formatters': {
                'console-formatter': {
                    '()': structlog.stdlib.ProcessorFormatter,
                    'processor': structlog.dev.ConsoleRenderer(colors=True),
                },
            },
            'handlers': {
                'stderr': {
                    'level': level,
                    'class': 'logging.StreamHandler',
                    'formatter': 'console-formatter',
                    'stream': 'ext://sys.stderr'
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
