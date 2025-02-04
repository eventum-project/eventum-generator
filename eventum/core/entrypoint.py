import atexit
import os
import signal
import time
from contextlib import suppress
from multiprocessing.managers import DictProxy
from threading import Event, Thread
from typing import Iterable

import structlog
from setproctitle import getproctitle, setproctitle

from eventum.core.config import ConfigurationLoadError, load
from eventum.core.executor import (ExecutionError, Executor,
                                   ImproperlyConfiguredError)
from eventum.core.gauge import MetricsGauge
from eventum.core.initializer import InitializationError, init_plugins
from eventum.core.models.exit_codes import ExitCode
from eventum.core.models.parameters.generator import GeneratorParameters

logger = structlog.stdlib.get_logger()


def start(params: GeneratorParameters, metrics: DictProxy) -> None:
    """Start generator execution.

    Parameters
    ----------
    params : GeneratorParameters
        Parameters for generator

    metrics : DictProxy
        Metrics dict that should be periodically updated
    """
    setproctitle(title=f'{getproctitle()} ({params.id})')

    logger.info('Loading configuration')
    init_start_time = time.time()

    try:
        config = load(params.path, params.params)
    except ConfigurationLoadError as e:
        logger.error(str(e), **e.context)
        exit(ExitCode.CONFIG_ERROR)
    except Exception as e:
        logger.exception(
            'Unexpected error occurred during loading config',
            reason=str(e),
            file_path=params.path
        )
        exit(ExitCode.UNEXPECTED_ERROR)

    working_dir = os.path.dirname(os.path.abspath(params.path))
    logger.info('Setting working directory', path=working_dir)
    os.chdir(working_dir)

    logger.info('Initializing plugins')
    try:
        plugins = init_plugins(
            input=config.input,
            event=config.event,
            output=config.output,
            params=params
        )
    except InitializationError as e:
        logger.error(str(e), **e.context)
        exit(ExitCode.INIT_ERROR)
    except Exception as e:
        logger.exception(
            'Unexpected error occurred during initializing plugins',
            reason=str(e)
        )
        exit(ExitCode.UNEXPECTED_ERROR)

    try:
        executor = Executor(
            input=plugins.input,
            event=plugins.event,
            output=plugins.output,
            params=params
        )
    except ImproperlyConfiguredError as e:
        logger.error(str(e), **e.context)
        exit(ExitCode.INIT_ERROR)
    except Exception as e:
        logger.exception(
            'Unexpected error occurred during initializing',
            reason=str(e)
        )
        exit(ExitCode.UNEXPECTED_ERROR)

    gauge = MetricsGauge(
        input=plugins.input,
        event=plugins.event,
        output=plugins.output,
        params=params
    )
    stop_event = Event()
    gauge_thread = Thread(
        target=_gauge_metrics,
        args=(gauge, metrics, stop_event, params.metrics_interval),
        name='MetricsGaugingThread'
    )

    signal.signal(
        signal.SIGTERM,
        lambda _, __:  handle_termination(
            events=[stop_event],
            threads=[gauge_thread],
            timeout=1,
            exit_code=ExitCode.TERMINATED
        )
    )

    init_time = round(time.time() - init_start_time, 3)
    logger.info('Initialization completed', seconds=init_time)

    logger.info('Starting execution', parameters=params.model_dump())

    gauge_thread.start()
    try:
        executor.execute()
    except ExecutionError as e:
        logger.error(str(e), **e.context)
        exit_code = ExitCode.EXECUTION_ERROR
    except Exception as e:
        logger.exception(
            'Unexpected error occurred during execution',
            reason=str(e)
        )
        exit_code = ExitCode.UNEXPECTED_ERROR
    else:
        logger.info('Finishing execution')
        exit_code = ExitCode.SUCCESS

    handle_termination(
        events=[stop_event],
        threads=[gauge_thread],
        timeout=1,
        exit_code=exit_code
    )


def _gauge_metrics(
    gauge: MetricsGauge,
    metrics: DictProxy,
    stop_event: Event,
    interval: float
) -> None:
    """Gauge metrics and update metrics until stop event is set.

    Parameters
    ----------
    gauge : MetricsGauge
        Gauge for metrics gauging

    metrics : DictProxy
        Dict to update metrics in

    stop_event : Event
        Stop event

    interval : float
        Time interval (in seconds) of metrics gauging

    Raises
    ------
    ValueError
        If interval is less or equal to zero
    """
    if interval <= 0:
        raise ValueError('Interval must be greater than zero')

    while not stop_event.wait(timeout=interval):
        metrics.update(gauge.gauge_metrics())

    # To the moment of stop event metrics proxy might be already closed
    # But anyway we try to actualize eventual metrics if it's possible
    with suppress(EOFError):
        metrics.update(gauge.gauge_metrics())


def handle_termination(
    events: Iterable[Event],
    threads: Iterable[Thread],
    timeout: float = 1.0,
    exit_code: ExitCode = ExitCode.SUCCESS
) -> None:
    """Handle termination of generator by setting all provided events,
    joining all provided threads and running callbacks registered with
    `atexit.register` in corresponding order within a provided timeout.

    Parameters
    ----------
    events: Iterable[Event]
        Events to set

    threads: Iterable[Thread]
        Threads to join

    timeout : float, default=1.0
        Maximum time (in seconds) for joining all threads

    exit_code : ExitCode, default=ExitCode.SUCCESS
        Code to exit with
    """
    for event in events:
        event.set()

    start_time = time.time()

    for thread in threads:
        spent = time.time() - start_time
        available_time = max(timeout - spent, 0)
        thread.join(available_time)

        if thread.is_alive():
            logger.warning(
                'Thread was not joined in time',
                thread_name=thread.name,
                thread_id=thread.native_id
            )

    atexit._run_exitfuncs()
    os._exit(exit_code)
