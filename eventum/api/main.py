"""API application definition."""

import structlog
from fastapi import FastAPI

from eventum.api.routes.generators import router as generators_router
from eventum.app.manager import GeneratorManager
from eventum.app.models.settings import Settings
from eventum.exceptions import ContextualError

logger = structlog.stdlib.get_logger()


class APIBuildingError(ContextualError):
    """Error during building API app."""


def build_api_app(
    generator_manager: GeneratorManager,
    settings: Settings,
) -> FastAPI:
    """Build FastAPI application.

    Parameters
    ----------
    generator_manager : GeneratorManager
        Manager of generators.

    settings : Settings
        Application settings.

    Returns
    -------
    Built FastAPI application.

    """
    app = FastAPI(
        title='Eventum API',
        description=(
            'API for generators management, interaction with plugins '
            'and app settings configuration.'
        ),
        version='1.0.0',
        root_path='/api/v1',
        docs_url='/swagger',
        redoc_url=None,
        contact={
            'name': 'Eventum Project',
            'url': 'https://eventum-project.github.io/website/',
        },
        license_info={
            'name': 'Apache 2.0',
            'url': 'https://github.com/eventum-project/eventum-generator/blob/master/LICENSE',
        },
    )

    logger.debug('Injecting API runtime dependencies')
    app.state.generator_manager = generator_manager
    app.state.settings = settings

    logger.debug('Connecting routers')
    app.include_router(generators_router)

    return app
