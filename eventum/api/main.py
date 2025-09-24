"""API application definition."""

import structlog
from fastapi import FastAPI

import eventum
from eventum.api.dependencies.authentication import (
    HttpAuthDepends,
    WebsocketAuthDepends,
)
from eventum.api.routers.docs import router as docs_router
from eventum.api.routers.docs.ws_schema_generator import (
    generate_asyncapi_schema,
    register_asyncapi_schema,
)
from eventum.api.routers.generator_configs import (
    router as generator_configs_router,
)
from eventum.api.routers.generators import router as generators_router
from eventum.api.routers.generators import ws_router as ws_generators_router
from eventum.api.routers.preview import router as preview_router
from eventum.api.routers.secrets import router as secrets_router
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

    Raises
    ------
    RuntimeError
        If API app build fails due to some error.

    """
    app = FastAPI(
        title='Eventum API',
        description=(
            'API for managing generators, plugins and its dependencies'
        ),
        version=eventum.__version__,
        root_path='/api',
        docs_url='/swagger',
        redoc_url='/redoc',
        contact={
            'name': 'Eventum Project',
            'url': 'https://github.com/eventum-project',
        },
        license_info={
            'name': 'Apache 2.0',
            'url': 'https://github.com/eventum-project/eventum-generator/blob/master/LICENSE',
        },
        openapi_external_docs={
            'description': 'Eventum Documentation',
            'url': 'https://eventum-project.github.io/website/',
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
        dependencies=[HttpAuthDepends],
    )
    app.include_router(
        ws_generators_router,
        prefix='/generators',
        tags=['Generators', 'Websocket'],
        dependencies=[WebsocketAuthDepends],
    )
    app.include_router(
        generator_configs_router,
        prefix='/generator_configs',
        tags=['Generator configs'],
        dependencies=[HttpAuthDepends],
    )
    app.include_router(
        preview_router,
        prefix='/preview',
        tags=['Preview'],
        dependencies=[HttpAuthDepends],
    )
    app.include_router(docs_router, tags=['Docs'])
    app.include_router(
        secrets_router,
        prefix='/secrets',
        tags=['Secrets'],
        dependencies=[HttpAuthDepends],
    )

    asyncapi_schema = generate_asyncapi_schema(
        app=app,
        host=settings.api.host,
        port=settings.api.port,
    )
    register_asyncapi_schema(schema=asyncapi_schema)

    return app
