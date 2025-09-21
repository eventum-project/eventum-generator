"""API application definition."""

import structlog
from fastapi import FastAPI

import eventum
from eventum.api.routers.generator_configs import (
    router as generator_configs_router,
)
from eventum.api.routers.generators import router as generators_router
from eventum.api.routers.preview import router as preview_router
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
            'API for managing generators, plugins and its dependencies'
        ),
        version=eventum.__version__,
        root_path='/api',
        docs_url='/swagger',
        redoc_url='/doc',
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
    app.include_router(
        generators_router,
        prefix='/generators',
        tags=['Generators'],
    )
    app.include_router(
        generator_configs_router,
        prefix='/generator_configs',
        tags=['Generator configs'],
    )
    app.include_router(preview_router, prefix='/preview', tags=['Preview'])

    return app
