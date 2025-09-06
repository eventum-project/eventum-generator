"""Dependencies of generators router."""

from typing import Annotated

from fastapi import Depends, Request

from eventum.app.manager import GeneratorManager


def get_generator_manager(request: Request) -> GeneratorManager:
    """Get generator manager.

    Parameters
    ----------
    request : Request
        Current request.

    Returns
    -------
    GeneratorManager
        Obtained generator manager.

    """
    return request.app.state.generator_manager


GeneratorManagerDep = Annotated[
    GeneratorManager,
    Depends(get_generator_manager),
]
