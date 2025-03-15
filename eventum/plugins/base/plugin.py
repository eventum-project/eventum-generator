"""Definition of base plugin."""

import importlib
import inspect
from abc import ABC
from collections.abc import Iterator
from contextlib import contextmanager
from copy import deepcopy
from pathlib import Path
from types import ModuleType
from typing import (
    Any,
    Generic,
    NotRequired,
    Required,
    TypedDict,
    TypeVar,
    get_args,
)
from uuid import uuid4

import structlog
from pydantic import RootModel

from eventum.plugins.base.config import PluginConfig
from eventum.plugins.base.metrics import PluginMetrics
from eventum.plugins.exceptions import (
    PluginConfigurationError,
    PluginRegistrationError,
)
from eventum.plugins.registry import PluginInfo, PluginsRegistry

logger = structlog.stdlib.get_logger()


class _PluginRegistrationInfo(TypedDict):
    """Information about plugin for registration.

    Attributes
    ----------
    name : str
        Name of the plugin

    type : str
        Type of the plugin (e.g. input, event, ...)

    package : ModuleType
        Parent package of plugin package

    """

    name: str
    type: str
    package: ModuleType


class PluginInstanceInfo(TypedDict):
    """Information about instance of plugin.

    Attributes
    ----------
    plugin_name : str
        Name of the plugin

    plugin_type : str
        Type of the plugin

    plugin_id : int
        ID of the plugin instance

    """

    plugin_name: str
    plugin_type: str
    plugin_id: int


def _inspect_plugin(plugin_cls: type) -> _PluginRegistrationInfo:
    """Inspect plugin to get registration info.

    Parameters
    ----------
    plugin_cls : type
        Class of the plugin to inspect

    Returns
    -------
    _PluginRegistrationInfo
        Information for plugin registration

    Raises
    ------
    TypeError
        If provided class cannot be inspected

    """
    class_module = inspect.getmodule(plugin_cls)
    if class_module is None:
        msg = 'Cannot get module of plugin class definition'
        raise TypeError(msg)

    if class_module.__name__ == '__main__':
        msg = 'Plugin can be used only as external module'
        raise TypeError(msg)

    try:
        # expected structure for extraction:
        # eventum.plugins.<plugin_type>.plugins.<plugin_name>.plugin
        module_parts = class_module.__name__.split('.')
        plugin_name = module_parts[-2]
        plugin_type = module_parts[-4]
        plugin_parent_package_name = '.'.join(module_parts[:-2])
    except IndexError:
        msg = (
            'Cannot extract information from plugin '
            f'module name "{class_module.__name__}"'
        )
        raise TypeError(msg) from None

    try:
        package = importlib.import_module(plugin_parent_package_name)
    except ImportError as e:
        msg = (
            'Cannot import parent package of plugin package '
            f'"{plugin_parent_package_name}": {e}'
        )
        raise TypeError(msg) from e

    return _PluginRegistrationInfo(
        name=plugin_name,
        type=plugin_type,
        package=package,
    )


class PluginParams(TypedDict):
    """Parameters for plugin.

    Attributes
    ----------
    id : int
        Numeric plugin identifier

    ephemeral_name : str
        Ephemeral name of plugin, might be helpful when plugin is not
        registered but it needs representable name to moment of
        initialization

    ephemeral_type : str
        Ephemeral type of plugin, might be helpful when plugin is not
        registered but it needs representable type to moment of
        initialization

    base_path : Required[Path]
        Base path for all relative paths used in plugin configurations,
        if it is not provided then current working directory is used

    """

    id: Required[int]
    ephemeral_name: NotRequired[str]
    ephemeral_type: NotRequired[str]
    base_path: NotRequired[Path]


ConfigT = TypeVar('ConfigT', bound=(PluginConfig | RootModel))
ParamsT = TypeVar('ParamsT', bound=PluginParams)


class Plugin(ABC, Generic[ConfigT, ParamsT]):
    """Base class for all plugins.

    Other Parameters
    ----------------
    register : bool, default=True
        Whether to register class as complete plugin

    Notes
    -----
    All subclasses of this class is considered as complete plugins
    if inheritance parameter `register` is set to `True`. Complete
    plugins are automatically registered in `PluginsRegistry`.

    """

    def __init__(self, config: ConfigT, params: ParamsT) -> None:
        """Initialize plugin.

        Parameters
        ----------
        config : ConfigT
            Configuration for the plugin

        params : ParamsT
            Parameters for plugin (see `PluginParams`)

        """
        with self._required_params():
            self._id = params['id']

        self._guid = str(uuid4())

        if 'ephemeral_name' in params:
            self._plugin_name = params['ephemeral_name']
        if 'ephemeral_type' in params:
            self._plugin_type = params['ephemeral_type']

        self._base_path = params.get('base_path', Path.cwd())

        self._config = config
        self._logger = logger.bind(**self.instance_info)

        self._metrics = PluginMetrics(
            name=self.plugin_name,
            id=self.id,
            configuration=self.config.model_dump(),
        )

    @contextmanager
    def _required_params(self) -> Iterator:
        """Context manager for handling missing keys in plugin parameters.

        Raises
        ------
        PluginConfigurationError
            If `KeyError` is raised

        """
        try:
            yield
        except KeyError as e:
            msg = 'Missing required parameter'
            raise PluginConfigurationError(
                msg,
                context=dict(self.instance_info, reason=str(e)),
            ) from None

    def __str__(self) -> str:
        return f'<{self.plugin_name} {self.plugin_type} plugin [{self._id}]>'

    def __init_subclass__(
        cls,
        *,
        register: bool = True,
        **kwargs: Any,  # noqa: ANN401
    ) -> None:
        super().__init_subclass__(**kwargs)

        context = {'plugin_class': cls.__name__}

        log = logger.bind(**context)

        if not register:
            cls._plugin_name = '[unregistered]'  # type: ignore[attr-defined]
            cls._plugin_type = '[unregistered]'  # type: ignore[attr-defined]
            return

        try:
            registration_info = _inspect_plugin(cls)
        except TypeError as e:
            msg = 'Unable to inspect plugin'
            raise PluginRegistrationError(
                msg,
                context=dict(context, reason=str(e)),
            ) from e

        plugin_name = registration_info['name']
        plugin_type = registration_info['type']
        cls._plugin_name = plugin_name  # type: ignore[attr-defined]
        cls._plugin_type = plugin_type  # type: ignore[attr-defined]

        try:
            (config_cls, *_) = get_args(
                cls.__orig_bases__[0],  # type: ignore[attr-defined]
            )
        except ValueError:
            msg = 'Generic parameters must be specified'
            raise PluginRegistrationError(
                msg,
                context=context,
            ) from None
        except Exception as e:
            msg = 'Unable to define config class'
            raise PluginRegistrationError(
                msg,
                context=dict(context, reason=str(e)),
            ) from e

        if isinstance(config_cls, TypeVar):
            msg = 'Config class cannot have generic type'
            raise PluginRegistrationError(msg, context=context)

        PluginsRegistry.register_plugin(
            PluginInfo(
                name=registration_info['name'],
                cls=cls,
                config_cls=config_cls,
                package=registration_info['package'],
            ),
        )

        log.info(
            'Plugin is registered',
            plugin_type=registration_info['type'],
            plugin_name=registration_info['name'],
            plugin_config_class=config_cls.__name__,
        )

    @property
    def id(self) -> int:
        """ID of the plugin."""
        return self._id

    @property
    def guid(self) -> str:
        """GUID of the plugin."""
        return self._guid

    @property
    def plugin_name(self) -> str:
        """Canonical name of the plugin."""
        return self._plugin_name

    @property
    def plugin_type(self) -> str:
        """Type of the plugin."""
        return self._plugin_type

    @property
    def instance_info(self) -> PluginInstanceInfo:
        """Information about plugin instance."""
        return {
            'plugin_name': self.plugin_name,
            'plugin_type': self.plugin_type,
            'plugin_id': self.id,
        }

    @property
    def config(self) -> ConfigT:
        """Plugin config."""
        return self._config

    def get_metrics(self) -> PluginMetrics:
        """Get plugin metrics.

        Returns
        -------
        PluginMetrics
            Plugins metrics

        """
        return deepcopy(self._metrics)
