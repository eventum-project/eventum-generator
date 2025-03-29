"""Main application definition."""

from collections.abc import Iterable

import structlog
import yaml
from flatten_dict import flatten, unflatten  # type: ignore[import-untyped]
from pydantic import ValidationError, validate_call

from eventum.app.manager import GeneratorManager, ManagingError
from eventum.app.models.settings import Settings
from eventum.core.parameters import GeneratorParameters
from eventum.exceptions import ContextualError
from eventum.utils.validation_prettier import prettify_validation_errors

logger = structlog.stdlib.get_logger()


class AppError(ContextualError):
    """Application error."""


class App:
    """Main application."""

    def __init__(self, settings: Settings) -> None:
        """Initialize App.

        Parameters
        ----------
        settings : Settings
            Settings of the applications.

        """
        self._settings = settings
        self._manager = GeneratorManager()

    def start(self) -> None:
        """Start the app.

        Raises
        ------
        AppError
            If error occurs during initialization.

        """
        gen_list = self._load_generators_list()
        self._start_generators(generators_params=gen_list)

        if self._settings.api.enabled:
            self._start_api()

    def stop(self) -> None:
        """Stop the app."""
        if self._settings.api.enabled:
            logger.info('Stopping the API')
            self._stop_api()

        logger.info('Stopping generators')
        self._stop_generators()

    @validate_call
    def _validate_generators_list(
        self,
        object: list[dict],
    ) -> list[GeneratorParameters]:
        """Validate list of generators.

        Parameters
        ----------
        object : list[dict]
            Object loaded from content of file with list of generators.

        Returns
        -------
        list[GeneratorParameters]
            Validated list of generators parameters applied above
            generation parameters from setting.

        Raises
        ------
        ValidationError
            If validation of provided object fails.

        """
        generators_parameters: list[GeneratorParameters] = []

        base_params = self._settings.generation.model_dump()
        for params in object:
            base_params = flatten(base_params, reducer='dot')
            generator_params = flatten(params, reducer='dot')

            generator_params = base_params | generator_params
            generator_params = unflatten(generator_params, splitter='dot')

            generators_parameters.append(
                GeneratorParameters.model_validate(generator_params),
            )

        return generators_parameters

    def _load_generators_list(self) -> list[GeneratorParameters]:
        """Load generators list from specified file.

        Returns
        -------
        list[GeneratorParameters]
            List of defined generators parameters.

        Raises
        ------
        AppError
            If error occurs during loading generators list.

        """
        logger.info(
            'Loading generators list',
            file_path=self._settings.path.generators,
        )
        try:
            with self._settings.path.generators.open() as f:
                content = f.read()
        except OSError as e:
            msg = 'Failed to read generators list'
            raise AppError(
                msg,
                context={
                    'file_path': self._settings.path.generators,
                    'reason': str(e),
                },
            ) from None

        try:
            obj = yaml.load(content, Loader=yaml.SafeLoader)
        except yaml.error.YAMLError as e:
            msg = 'Failed to parse generators list'
            raise AppError(
                msg,
                context={
                    'file_path': self._settings.path.generators,
                    'reason': str(e),
                },
            ) from None

        try:
            return self._validate_generators_list(obj)
        except ValidationError as e:
            msg = 'Invalid structure of generators list'
            raise AppError(
                msg,
                context={'reason': prettify_validation_errors(e.errors())},
            ) from None

    def _start_generators(
        self,
        generators_params: Iterable[GeneratorParameters],
    ) -> None:
        """Start generators.

        Parameters
        ----------
        generators_params : Iterable[GeneratorParameters]
            List of generator parameters.

        """
        running_generators: list[str] = []
        non_running_generators: list[str] = []

        for params in generators_params:
            logger.info('Starting generator', generator_id=params.id)
            try:
                self._manager.add(params)
                self._manager.start(params.id)
                running_generators.append(params.id)
            except ManagingError as e:
                non_running_generators.append(params.id)
                logger.error(
                    'Failed to start generator',
                    generator_id=params.id,
                    reason=str(e),
                )

        if len(running_generators) > 0:
            message = 'Generators are running'
        else:
            message = 'No generators are running'

        logger.info(
            message,
            count=len(running_generators),
            running_generators=running_generators,
            non_running_generators=non_running_generators,
        )

    def _stop_generators(self) -> None:
        """Stop generators."""
        self._manager.bulk_stop(self._manager.generator_ids)

    def _start_api(self) -> None:
        """Start application API."""
        # TODO: implement

    def _stop_api(self) -> None:
        """Stop application API."""
        # TODO: implement
