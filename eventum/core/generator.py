import os
import time
from threading import Thread, get_native_id

import structlog

from eventum.core.config import ConfigurationLoadError, load
from eventum.core.executor import (ExecutionError, Executor,
                                   ImproperlyConfiguredError)
from eventum.core.gauge import MetricsGauge
from eventum.core.initializer import (InitializationError, InitializedPlugins,
                                      init_plugins)
from eventum.core.models.config import GeneratorConfig
from eventum.core.models.metrics import Metrics
from eventum.core.models.parameters.generator import GeneratorParameters

logger = structlog.stdlib.get_logger()


class Generator:
    """Thread-wrapped generator."""

    def __init__(self, params: GeneratorParameters) -> None:
        self._params = params
        self._config: GeneratorConfig | None = None
        self._plugins: InitializedPlugins | None = None
        self._executor: Executor | None = None
        self._gauge: MetricsGauge | None = None
        self._thread = Thread(target=self._start)

    def _start(self) -> None:
        """Start generation.

        Raises
        ------
        ConfigurationLoadError
            If error occurs during configuration loading

        InitializationError
            If error occurs during plugin initialization

        ImproperlyConfiguredError
            If error occurs during executor initialization

        ExecutionError
            If any error occurs during execution
        """
        # All exceptions are logged before propagated because we want to
        # inform user about potential errors in logs as soon as possible
        logger.info(
            'Generator is started',
            process_id=os.getpid(),
            thread_id=get_native_id()
        )

        init_start_time = time.monotonic()

        logger.info('Loading configuration', file_path=self._params.path)
        try:
            self._config = load(self._params.path, self._params.params)
        except ConfigurationLoadError as e:
            logger.error(str(e), **e.context)
            raise e
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during loading config',
                reason=str(e),
                file_path=self._params.path
            )
            raise e

        logger.info('Initializing plugins')
        try:
            self._plugins = init_plugins(
                input=self._config.input,
                event=self._config.event,
                output=self._config.output,
                params=self._params
            )
        except InitializationError as e:
            logger.error(str(e), **e.context)
            raise e
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during initializing plugins',
                reason=str(e)
            )
            raise e

        logger.info('Initializing plugins executor')
        try:
            self._executor = Executor(
                input=self._plugins.input,
                event=self._plugins.event,
                output=self._plugins.output,
                params=self._params
            )
        except ImproperlyConfiguredError as e:
            logger.error(str(e), **e.context)
            raise e
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during initializing',
                reason=str(e)
            )
            raise e

        self._gauge = MetricsGauge(
            input=self._plugins.input,
            event=self._plugins.event,
            output=self._plugins.output,
            params=self._params
        )

        init_time = round(time.monotonic() - init_start_time, 3)
        logger.info('Initialization completed', seconds=init_time)

        logger.info('Starting execution', parameters=self._params)

        try:
            self._executor.execute()
        except ExecutionError as e:
            logger.error(str(e), **e.context)
            raise e
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during execution',
                reason=str(e)
            )
            raise e

    def start(self) -> None:
        """Start generator in separate thread."""
        if self.is_running:
            return

        self._thread.start()

    def stop(self) -> None:
        """Stop generator with joining underlying thread and
        propagating all possible exceptions.

        Raises
        ------
        RuntimeError
            If generator is not started
        """
        if not self.is_running:
            return

        if self._executor is None:
            raise RuntimeError('Generator is not started')

        self._executor.request_stop()

        try:
            self._thread.join()
        except Exception:
            logger.error('Generator stopped with errors')
        else:
            logger.info('Generator stopped successfully')

    def join(self) -> None:
        """Wait until generator terminates with propagating all
        possible exceptions.
        """
        if not self.is_running:
            return

        try:
            self._thread.join()
        except Exception:
            logger.error('Generator ended up with errors')
        else:
            logger.info('Generator ended up successfully')

    def get_metrics(self) -> Metrics:
        """Get generator metrics if available.

        Returns
        -------
        Metrics
            Generator metrics

        Raises
        ------
        RuntimeError
            If generator is not started
        """
        if self._gauge is None:
            raise RuntimeError('Generator is not started')

        return self._gauge.gauge_metrics()

    @property
    def is_running(self) -> bool:
        """Whether the generator is running."""
        return self._thread.is_alive()
