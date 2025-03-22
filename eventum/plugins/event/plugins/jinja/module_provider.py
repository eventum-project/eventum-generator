"""Definition of module provider for accessing modules from templates."""

import importlib
from types import ModuleType


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

        try:
            module = importlib.import_module(f'{self._package_name}.{key}')
        except ModuleNotFoundError:
            try:
                module = importlib.import_module(key)
            except ModuleNotFoundError:
                msg = f'Module "{key}" is not found'
                raise KeyError(msg) from None
        except ImportError as e:
            msg = f'Failed to import module "{key}": {e}'
            raise KeyError(msg) from None

        self._imported_modules[key] = module

        return module
