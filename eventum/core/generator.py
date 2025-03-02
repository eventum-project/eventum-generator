from threading import Thread

import structlog

from eventum.core.config import load
from eventum.core.executor import Executor
from eventum.core.gauge import MetricsGauge
from eventum.core.initializer import InitializedPlugins, init_plugins
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
        logger.info('Loading configuration', file_path=self._params.path)
        self._config = load(self._params.path, self._params.params)

        logger.info('Initializing plugins')
        self._plugins = init_plugins(
            input=self._config.input,
            event=self._config.event,
            output=self._config.output,
            params=self._params
        )

        logger.info('Initializing plugins executor')
        self._executor = Executor(
            input=self._plugins.input,
            event=self._plugins.event,
            output=self._plugins.output,
            params=self._params
        )

        self._gauge = MetricsGauge(
            input=self._plugins.input,
            event=self._plugins.event,
            output=self._plugins.output,
            params=self._params
        )

        self._executor.execute()

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
        self._thread.join()

    def join(self, timeout: float | None = None) -> bool:
        """Wait until generator terminates with propagating all
        possible exceptions.

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
