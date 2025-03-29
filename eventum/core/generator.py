"""Module for managing event generation process."""

import os
import time
from threading import Thread, get_native_id

import structlog

from eventum.core.config import GeneratorConfig
from eventum.core.config_loader import ConfigurationLoadError, load
from eventum.core.executor import (
    ExecutionError,
    Executor,
    ImproperlyConfiguredError,
)
from eventum.core.parameters import GeneratorParameters
from eventum.core.plugins_initializer import (
    InitializationError,
    InitializedPlugins,
    init_plugins,
)
from eventum.logging_context import propagate_logger_context

logger = structlog.stdlib.get_logger()


class Generator:
    """Thread-wrapped generator."""

    def __init__(self, params: GeneratorParameters) -> None:
        """Initialize generator.

        Parameters
        ----------
        params : GeneratorParameters
            Generator parameters.

        """
        self._params = params

        self._config: GeneratorConfig | None = None
        self._plugins: InitializedPlugins | None = None
        self._executor: Executor | None = None

        self._thread: Thread | None = None

    def _start(self) -> None:
        """Start generation.

        Raises
        ------
        ConfigurationLoadError
            If error occurs during configuration loading.

        InitializationError
            If error occurs during plugin initialization.

        ImproperlyConfiguredError
            If error occurs during executor initialization.

        ExecutionError
            If any error occurs during execution.

        """
        # All exceptions are logged before propagated because we want to
        # inform user about potential errors in logs as soon as possible

        structlog.contextvars.bind_contextvars(generator_id=self._params.id)

        logger.info(
            'Generator is started',
            process_id=os.getpid(),
            thread_id=get_native_id(),
        )

        init_start_time = time.monotonic()

        logger.info('Loading configuration', file_path=self._params.path)
        try:
            self._config = load(self._params.path, self._params.params)
        except ConfigurationLoadError as e:
            logger.error(str(e), **e.context)
            raise
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during loading config',
                reason=str(e),
                file_path=self._params.path,
            )
            raise

        logger.info('Initializing plugins')
        try:
            self._plugins = init_plugins(
                input=self._config.input,
                event=self._config.event,
                output=self._config.output,
                params=self._params,
            )
        except InitializationError as e:
            logger.error(str(e), **e.context)
            raise
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during initializing plugins',
                reason=str(e),
            )
            raise

        logger.info('Initializing plugins executor')
        try:
            self._executor = Executor(
                input=self._plugins.input,
                event=self._plugins.event,
                output=self._plugins.output,
                params=self._params,
            )
        except ImproperlyConfiguredError as e:
            logger.error(str(e), **e.context)
            raise
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during initializing',
                reason=str(e),
            )
            raise

        init_time = round(time.monotonic() - init_start_time, 3)
        logger.info('Initialization completed', seconds=init_time)

        logger.info('Starting execution', parameters=self._params)

        try:
            self._executor.execute()
        except ExecutionError as e:
            logger.error(str(e), **e.context)
            raise
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during execution',
                reason=str(e),
            )
            raise

    def start(self) -> None:
        """Start generator in separate thread. Ignore call if generator
        is already running.

        Raises
        ------
        RuntimeError
            If generator is initializing.

        """
        if self.is_running:
            return

        if self.is_initializing:
            msg = 'Generator is initializing'
            raise RuntimeError(msg)

        self._config = None
        self._plugins = None
        self._executor = None

        self._thread = Thread(target=propagate_logger_context()(self._start))
        self._thread.start()

    def stop(self) -> None:
        """Stop generator with joining underlying thread. Ignore call
        if generator is not running.

        Raises
        ------
        RuntimeError
            If generator is initializing.

        """
        if not self.is_running:
            return

        if self.is_initializing:
            msg = (
                'Generator is initializing, wait for initialization '
                'to complete'
            )
            raise RuntimeError(msg)

        self._executor.request_stop()  # type: ignore[union-attr]

        try:
            self._thread.join()  # type: ignore[union-attr]
        except Exception:  # noqa: BLE001
            logger.error('Generator stopped with errors')
        else:
            logger.info('Generator stopped successfully')

    def join(self) -> None:
        """Wait until generator terminates.

        Raises
        ------
        RuntimeError
            If generator is initializing.

        """
        if not self.is_running:
            return

        if self.is_initializing:
            msg = (
                'Generator is initializing, wait for initialization '
                'to complete'
            )
            raise RuntimeError(msg)

        try:
            self._thread.join()  # type: ignore[union-attr]
        except Exception:  # noqa: BLE001
            logger.error('Generator ended up with errors')
        else:
            logger.info('Generator ended up successfully')

    def get_plugins_info(self) -> InitializedPlugins:
        """Get plugins information.

        Returns
        -------
        InitializedPlugins
            Information about plugins.

        Raises
        ------
        RuntimeError
            If information about plugins is unavailable (e.g
            generator wasn't yet started).

        """
        if self._plugins is None:
            msg = 'No information about plugins is available'
            raise RuntimeError(msg)

        return self._plugins

    def get_config(self) -> GeneratorConfig:
        """Get generator config.

        Returns
        -------
        GeneratorConfig
            Generator config.

        Raises
        ------
        RuntimeError
            If information about plugins is unavailable (e.g
            generator wasn't yet started).

        """
        if self._config is None:
            msg = 'No information about config is available'
            raise RuntimeError(msg)

        return self._config

    @property
    def is_initializing(self) -> bool:
        """Whether the generator is initializing."""
        return (
            self._thread is not None
            and self._thread.is_alive()
            and not self.is_running
        )

    @property
    def is_running(self) -> bool:
        """Whether the generator is running."""
        return (
            self._thread is not None
            and self._thread.is_alive()
            and self._config is not None
            and self._plugins is not None
            and self._executor is not None
        )
