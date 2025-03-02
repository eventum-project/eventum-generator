from threading import Thread

import structlog

from eventum.core.config import ConfigurationLoadError, load
from eventum.core.executor import Executor, ImproperlyConfiguredError
from eventum.core.gauge import MetricsGauge
from eventum.core.initializer import InitializationError, init_plugins
from eventum.core.models.metrics import Metrics
from eventum.core.models.parameters.generator import GeneratorParameters
from eventum.utils.exceptions import ContextualException

logger = structlog.stdlib.get_logger()


class GeneratorInitializationError(ContextualException):
    """Error during generator initialization."""


class Generator:
    """Thread-wrapped generator.

    Raises
    ------
    GeneratorInitializationError
        If any error occurs during generator initialization
    """

    def __init__(self, params: GeneratorParameters) -> None:
        self._params = params

        logger.info('Loading configuration', file_path=self._params.path)
        try:
            self._config = load(self._params.path, self._params.params)
        except ConfigurationLoadError as e:
            raise GeneratorInitializationError(str(e), context=e.context)

        logger.info('Initializing plugins')
        try:
            self._plugins = init_plugins(
                input=self._config.input,
                event=self._config.event,
                output=self._config.output,
                params=self._params
            )
        except InitializationError as e:
            raise GeneratorInitializationError(str(e), context=e.context)

        logger.info('Initializing plugins executor')
        try:
            self._executor = Executor(
                input=self._plugins.input,
                event=self._plugins.event,
                output=self._plugins.output,
                params=self._params
            )
        except ImproperlyConfiguredError as e:
            raise GeneratorInitializationError(str(e), context=e.context)

        self._gauge = MetricsGauge(
            input=self._plugins.input,
            event=self._plugins.event,
            output=self._plugins.output,
            params=self._params
        )

        self._thread = Thread(target=self._executor.execute)

    def start(self) -> None:
        """Start generator in separate thread."""
        if self.is_running:
            return

        self._thread.start()

    def stop(self) -> None:
        """Stop generator with joining underlying thread. All possible
        exceptions are propagated.
        """
        if not self.is_running:
            return

        self._executor.request_stop()
        self._thread.join()

    def join(self, timeout: float | None = None) -> bool:
        """Wait until generator terminates. All possible exceptions are
        propagated.

        Parameters
        ----------
        timeout : float | None, default=None
            Timeout of generator joining

        Returns
        -------
        bool
            `True` if generator was joined in time, and `False` if
            timeout is expired
        """
        if not self.is_running:
            return True

        self._thread.join(timeout)

        return not self.is_running

    def get_metrics(self) -> Metrics:
        """Get generator metrics if available.

        Returns
        -------
        Metrics | None
            Generator metrics
        """
        return self._gauge.gauge_metrics()

    @property
    def is_running(self) -> bool:
        """Whether the generator is running."""
        return self._thread.is_alive()
