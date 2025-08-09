"""API application definition."""

from fastapi import FastAPI

from eventum.api.routes.generators import router as generators_router
from eventum.app.manager import GeneratorManager


def build_api_app(generator_manager: GeneratorManager) -> FastAPI:
    """Build FastAPI application.

    Parameters
    ----------
    generator_manager : GeneratorManager
        Manager of generators.

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

    app.state.generator_manager = generator_manager

    app.include_router(generators_router)

    return app
