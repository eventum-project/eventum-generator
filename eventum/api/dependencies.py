"""API app dependencies."""

from typing import Annotated

from fastapi import Depends, Request

from eventum.app.manager import GeneratorManager


def generator_manager(request: Request) -> GeneratorManager:
    """Get generator manager dependency.

    Parameters
    ----------
    request : Request
        Current request.

    Returns
    -------
    GeneratorManager
        Obtained generator manager

    """
    return request.app.state.generator_manager


GeneratorManagerDep = Annotated[GeneratorManager, Depends(generator_manager)]
