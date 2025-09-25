"""Module provider for accessing modules from templates."""

import importlib
from types import ModuleType

import structlog

logger = structlog.stdlib.get_logger()


class ModuleProvider:
    """Provider of modules used in jinja templates.
    By default custom modules are searched in `package_name` package,
    if module is not found there, then it is searched in environment
    packages.
    """

    def __init__(self, package_name: str) -> None:
        """Initialize module provider.

        Parameters
        ----------
        package_name : str
            Absolute name of the package with modules.

        """
        self._package_name = package_name
        self._imported_modules: dict[str, ModuleType] = {}

    def __getitem__(self, key: str) -> ModuleType:
        if key in self._imported_modules:
            return self._imported_modules[key]

        logger.debug(
            'Module is not found in cache and will be imported',
            module_name=key,
        )

        module_fqn = f'{self._package_name}.{key}'
        logger.debug(
            'Trying to import as local module first',
            module_name=module_fqn,
        )
        try:
            module = importlib.import_module(module_fqn)
        except ModuleNotFoundError:
            logger.debug(
                (
                    'Local module with that name is missing, '
                    'trying to import module from environment'
                ),
                module_name=key,
            )
            try:
                module = importlib.import_module(key)
            except ModuleNotFoundError:
                msg = f'Module `{key}` is not found'
                raise KeyError(msg) from None
        except ImportError as e:
            msg = f'Failed to import module `{key}`: {e}'
            raise KeyError(msg) from None

        self._imported_modules[key] = module

        return module
