"""Model for the main settings of the application."""

from pydantic import BaseModel

from eventum.app.models.parameters.api import APIParameters
from eventum.app.models.parameters.log import LogParameters
from eventum.app.models.parameters.path import PathParameters
from eventum.core.parameters import GenerationParameters


class Settings(BaseModel, extra='forbid', frozen=True):
    """Main settings of application.

    Attributes
    ----------
    api: APIParameters
        API parameters.

    generation: GenerationParameters
        Generation parameters.

    log : LogParameters
        Log parameters.

    path : PathParameters
        Path parameters.

    """

    api: APIParameters
    generation: GenerationParameters
    log: LogParameters
    path: PathParameters
