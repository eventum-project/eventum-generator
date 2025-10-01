"""Main application definition."""

from threading import Thread
from typing import TYPE_CHECKING

import structlog
import uvicorn
import yaml
from pydantic import ValidationError, validate_call

from eventum.app.hooks import InstanceHooks
from eventum.app.manager import GeneratorManager, ManagingError
from eventum.app.models.generators import GeneratorsParameters
from eventum.app.models.settings import Settings
from eventum.exceptions import ContextualError
from eventum.security.manage import SECURITY_SETTINGS
from eventum.utils.validation_prettier import prettify_validation_errors

if TYPE_CHECKING:
    from eventum.core.parameters import GeneratorParameters

logger = structlog.stdlib.get_logger()


class AppError(ContextualError):
    """Application error."""


class App:
    """Main application."""

    def __init__(
        self,
        settings: Settings,
        instance_hooks: InstanceHooks,
    ) -> None:
        """Initialize App.

        Parameters
        ----------
        settings : Settings
            Settings of the applications.

        instance_hooks : InstanceHooks
            Instance hooks.

        """
        logger.debug(
            'Initializing app with provided settings',
            parameters=settings.model_dump(),
        )
        self._settings = settings
        self._instance_hooks = instance_hooks

        logger.debug(
            'Setting up security parameters',
            parameters=settings.model_dump(),
        )
        SECURITY_SETTINGS['cryptfile_location'] = (
            settings.path.keyring_cryptfile
        )

        self._manager = GeneratorManager()

        self._server: uvicorn.Server | None = None
        self._server_thread = Thread(target=self._run_api_server, name='api')

    def start(self) -> None:
        """Start the app.

        Raises
        ------
        AppError
            If error occurs during initialization.

        """
        logger.info('Loading generators list')
        generators_params = self._load_startup_generators_params()

        logger.info('Starting generators')
        self._start_generators(generators_params=generators_params)

        if self._settings.api.enabled:
            from eventum.api.main import APIBuildingError

            logger.info(
                'Starting API',
                port=self._settings.api.port,
                host=self._settings.api.host,
            )
            try:
                self._start_api()
            except APIBuildingError as e:
                raise AppError(str(e), context=e.context) from e

    def stop(self) -> None:
        """Stop the app."""
        if self._settings.api.enabled:
            logger.info('Stopping the API')
            self._stop_api()

        logger.info('Stopping generators')
        self._stop_generators()

    @validate_call
    def _validate_generators_params(
        self,
        object: list[dict],
    ) -> GeneratorsParameters:
        """Validate list of generators.

        Parameters
        ----------
        object : list[dict]
            List with parameters of generators.

        Returns
        -------
        GeneratorsParameters
            Validated list of generators parameters applied above
            generation parameters from settings.

        Raises
        ------
        ValidationError
            If validation of provided object fails.

        """
        generators_parameters = (
            GeneratorsParameters.build_over_generation_parameters(
                object=object,
                generation_parameters=self._settings.generation,
            )
        )

        logger.debug(
            'Next base generation parameters will be used for generators',
            parameters=self._settings.generation.model_dump(),
        )

        normalized_params_list: list[GeneratorParameters] = []
        for params in generators_parameters.root:
            normalized_params = params.as_absolute(
                base_dir=self._settings.path.generators_dir,
            )
            normalized_params_list.append(normalized_params)

            if not normalized_params.path.is_relative_to(
                self._settings.path.generators_dir,
            ):
                logger.warning(
                    'Generator is outside the configured generators '
                    'directory. Consider moving it into specified directory '
                    'so it can be observed by the API.',
                    generator_id=normalized_params.id,
                    path=str(self._settings.path.generators_dir),
                )

        return GeneratorsParameters(root=tuple(normalized_params_list))

    def _load_startup_generators_params(self) -> GeneratorsParameters:
        """Load params of generators from the startup file specified in
        config.

        Returns
        -------
        GeneratorsParameters
            List of generators params.

        Raises
        ------
        AppError
            If error occurs during loading generators list.

        """
        logger.debug(
            'Reading generators list from startup file',
            file_path=str(self._settings.path.startup),
        )
        try:
            with self._settings.path.startup.open() as f:
                content = f.read()
        except OSError as e:
            msg = 'Failed to read generators list from startup file'
            raise AppError(
                msg,
                context={
                    'file_path': self._settings.path.startup,
                    'reason': str(e),
                },
            ) from None

        logger.debug('Parsing yaml content of generators list')
        try:
            obj = yaml.load(content, Loader=yaml.SafeLoader)
        except yaml.error.YAMLError as e:
            msg = 'Failed to parse generators list'
            raise AppError(
                msg,
                context={
                    'file_path': self._settings.path.startup,
                    'reason': str(e),
                },
            ) from None

        logger.debug('Validating generators list')
        try:
            return self._validate_generators_params(obj)
        except ValidationError as e:
            msg = 'Invalid structure of generators list'
            raise AppError(
                msg,
                context={'reason': prettify_validation_errors(e.errors())},
            ) from None

    def _start_generators(
        self,
        generators_params: GeneratorsParameters,
    ) -> None:
        """Start generators.

        Parameters
        ----------
        generators_params : GeneratorsParameters
            List of generators parameters.

        """
        added_generators: list[str] = []
        not_added_generators: list[str] = []

        for params in generators_params.root:
            try:
                self._manager.add(params)
                added_generators.append(params.id)
            except ManagingError as e:
                not_added_generators.append(params.id)
                logger.error(
                    'Failed to add generator to execution manager',
                    generator_id=params.id,
                    reason=str(e),
                )

        logger.debug(
            'Bulk starting generators',
            generator_ids=added_generators,
        )
        running_generators, non_running_generators = self._manager.bulk_start(
            generator_ids=added_generators,
        )
        non_running_generators.extend(not_added_generators)

        if len(running_generators) > 0:
            logger.info(
                'Generators are running',
                count=len(running_generators),
                running_generators=running_generators,
                non_running_generators=non_running_generators,
            )
        else:
            logger.warning(
                'No generators are running',
                count=len(running_generators),
                running_generators=running_generators,
                non_running_generators=non_running_generators,
            )

    def _stop_generators(self) -> None:
        """Stop generators."""
        generator_ids = self._manager.generator_ids
        logger.debug(
            'Bulk stopping generators',
            generator_ids=generator_ids,
        )
        self._manager.bulk_stop(generator_ids)

    def _run_api_server(self) -> None:
        """Run API server with handling possible errors."""
        if self._server is None:
            return

        try:
            self._server.run()
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during API server execution',
                reason=str(e),
            )

    def _start_api(self) -> None:
        """Start application API.

        Raises
        ------
        APIBuildingError
            If API building fails.

        """
        from eventum.api.main import build_api_app

        api_app = build_api_app(
            generator_manager=self._manager,
            settings=self._settings,
            instance_hooks=self._instance_hooks,
        )

        if self._settings.api.ssl.enabled:
            ssl_settings = {
                'ssl_ca_certs': self._settings.api.ssl.ca_cert,
                'ssl_certfile': self._settings.api.ssl.cert,
                'ssl_keyfile': self._settings.api.ssl.cert_key,
            }
        else:
            ssl_settings = {}

        self._server = uvicorn.Server(
            uvicorn.Config(
                api_app,
                host=self._settings.api.host,
                port=self._settings.api.port,
                access_log=True,
                log_config=None,
                **ssl_settings,  # type: ignore[arg-type]
            ),
        )
        self._server_thread.start()

    def _stop_api(self) -> None:
        """Stop application API."""
        if self._server is None:
            return

        self._server.should_exit = True

        if self._server_thread.is_alive():
            self._server_thread.join()
