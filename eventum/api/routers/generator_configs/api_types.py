"""API-layer type-resolved generator configuration models.

These models mirror `runtime_types.GeneratorConfig` but relax plugin
fields to accept ``${params.*}`` / ``${secrets.*}`` substitutions.
This keeps the OpenAPI schema detailed (every plugin field is visible
with its original type and rules) while letting the API read and write
configs that contain values not known until load time.

Plugin config source files (``plugins/*/config.py``) are **not**
modified — the relaxation is applied programmatically at import time.
"""

import inspect
import re
import sys
import types
from collections.abc import Callable
from copy import copy
from functools import wraps
from typing import (
    Annotated,
    Any,
    ForwardRef,
    Literal,
    TypeAliasType,
    Union,
    assert_never,
    cast,
    evaluate_forward_ref,
    get_args,
    get_origin,
)

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    RootModel,
    StringConstraints,
    TypeAdapter,
    ValidationInfo,
    create_model,
    field_validator,
    model_validator,
)
from pydantic.fields import FieldInfo
from pydantic_core import PydanticUndefined

from eventum.api.routers.generator_configs.runtime_types import (
    PluginNamedConfig,
)
from eventum.plugins.loader import (
    get_event_plugin_names,
    get_input_plugin_names,
    get_output_plugin_names,
    load_event_plugin,
    load_input_plugin,
    load_output_plugin,
)

# - Placeholder type -------------------------------------------------

_PLACEHOLDER_PATTERN = r'^\$\{\s*(?:params|secrets)\.[^\s}]+\s*\}$'
_SUBSTITUTION_PATTERN = r'\$\{\s*(?:params|secrets)\.[^\s}]+\s*\}'
_PLACEHOLDER_RE = re.compile(_PLACEHOLDER_PATTERN)
_SUBSTITUTION_RE = re.compile(_SUBSTITUTION_PATTERN)


def _validate_placeholder(value: str) -> str:
    if not _PLACEHOLDER_RE.match(value):
        msg = (
            'Value must be a ${params.*} or ${secrets.*} '
            f'placeholder, got: {value}'
        )
        raise ValueError(msg)
    return value


def _validate_substitution_string(value: str) -> str:
    if not _SUBSTITUTION_RE.search(value):
        msg = f'Value must carry a substitution token, got: {value}'
        raise ValueError(msg)
    return value


PlaceholderString = Annotated[
    str,
    StringConstraints(pattern=_PLACEHOLDER_PATTERN),
    AfterValidator(_validate_placeholder),
]
SubstitutionString = Annotated[
    str,
    StringConstraints(pattern=_SUBSTITUTION_PATTERN),
    AfterValidator(_validate_substitution_string),
]

# - Type relaxation --------------------------------------------------

_relaxed_model_cache: dict[type[BaseModel], type[BaseModel]] = {}
_relaxing_model_refs: dict[type[BaseModel], ForwardRef] = {}
_relaxed_forward_namespace: dict[str, type[BaseModel]] = {}


def _already_accepts_any_str(tp: type) -> bool:
    """Return True if the type is ``str`` (bare).

    Already accepts any string including placeholders without extra
    validation.
    """
    return tp is str


def _accepts_any_str(annotation: Any) -> bool:
    """Return whether an annotation has an unconstrained string branch."""
    if _already_accepts_any_str(annotation):
        return True

    if isinstance(annotation, TypeAliasType):
        return _accepts_any_str(annotation.__value__)

    origin = get_origin(annotation)
    args = get_args(annotation)
    if origin is Annotated:
        return _accepts_any_str(args[0])

    if origin is types.UnionType or origin is Union:
        return any(_accepts_any_str(arg) for arg in args)

    return False


def _relax_type(  # noqa: C901, PLR0911, PLR0912
    annotation: Any,
    *,
    namespace: dict[str, Any] | None = None,
) -> Any:
    """Recursively transform a type annotation to also accept
    ``PlaceholderString``.

    Examples
    --------
    >>> _relax_type(int)
    int | PlaceholderString
    >>> _relax_type(list[HttpUrl])
    list[HttpUrl | PlaceholderString]
    >>> _relax_type(str)
    str  # unchanged

    """
    # ---- leaf cases --------------------------------------------------
    if annotation is type(None):
        return annotation

    if isinstance(annotation, ForwardRef):
        resolved = evaluate_forward_ref(
            annotation,
            globals=namespace,
            locals=namespace,
        )
        return _relax_type(resolved, namespace=namespace)

    if _already_accepts_any_str(annotation):
        return annotation

    # ---- TypeAliasType (Python 3.12+ `type X = ...`) -----------------
    # Pydantic stores these unresolved; unwrap to the underlying type.
    if isinstance(annotation, TypeAliasType):
        module_name = cast('str', annotation.__module__)
        alias_namespace = vars(sys.modules[module_name])
        return _relax_type(
            annotation.__value__,
            namespace=alias_namespace,
        )

    origin = get_origin(annotation)
    args = get_args(annotation)

    # ---- Union (includes T | None) -----------------------------------
    if origin is types.UnionType or origin is Union:
        return Union[*(_relax_type(arg, namespace=namespace) for arg in args)]

    # ---- list[T] → list[_relax(T)] | PlaceholderString ----------------
    # Inner elements are relaxed AND the whole list can be a placeholder.
    if origin is list:
        inner = args[0] if args else Any
        relaxed_inner = _relax_type(inner, namespace=namespace)
        return list[relaxed_inner] | PlaceholderString  # type: ignore[valid-type]

    # ---- dict[K, V] --------------------------------------------------
    if origin is dict:
        key = args[0] if args else Any
        value = args[1] if len(args) > 1 else Any
        return (
            dict[  # type: ignore[misc]
                _relax_type(key, namespace=namespace),
                _relax_type(value, namespace=namespace),
            ]
            | PlaceholderString
        )

    # ---- tuple[T, ...], tuple[T, U], set[T], frozenset[T] -----------
    if origin is tuple:
        if args and args[-1] is Ellipsis:
            relaxed_item = _relax_type(args[0], namespace=namespace)
            return (
                tuple[relaxed_item, ...]  # type: ignore[valid-type]
                | PlaceholderString
            )

        relaxed_items = tuple(
            _relax_type(arg, namespace=namespace) for arg in args
        )
        return (
            tuple[*relaxed_items]  # type: ignore[valid-type]
            | PlaceholderString
        )

    if origin is set:
        inner = args[0] if args else Any
        relaxed_inner = _relax_type(inner, namespace=namespace)
        return set[relaxed_inner] | PlaceholderString  # type: ignore[valid-type]

    if origin is frozenset:
        inner = args[0] if args else Any
        relaxed_inner = _relax_type(inner, namespace=namespace)
        return (
            frozenset[relaxed_inner]  # type: ignore[valid-type]
            | PlaceholderString
        )

    # ---- Annotated[T, metadata...] -----------------------------------
    # Keep constraints on the original type; add PlaceholderString as a
    # separate union member so constraints only apply to the typed
    # branch.
    if origin is Annotated:
        base = args[0]
        metadata = args[1:]
        substitution_type = (
            SubstitutionString if _accepts_any_str(base) else PlaceholderString
        )

        relaxed_base = _relax_type(base, namespace=namespace)
        relaxed_origin = get_origin(relaxed_base)
        if relaxed_origin is types.UnionType or relaxed_origin is Union:
            concrete_args = tuple(
                arg
                for arg in get_args(relaxed_base)
                if arg not in (PlaceholderString, SubstitutionString)
            )
            concrete_base = (
                concrete_args[0]
                if len(concrete_args) == 1
                else Union[*concrete_args]
            )
        else:
            concrete_base = relaxed_base

        return (
            Annotated[concrete_base, *metadata]  # type: ignore[valid-type]
            | substitution_type
        )

    # ---- Literal[...] ------------------------------------------------
    if origin is Literal:
        return annotation | PlaceholderString

    # ---- Pydantic BaseModel subclass (nested config) -----------------
    if isinstance(annotation, type) and issubclass(
        annotation,
        BaseModel,
    ):
        if annotation in _relaxing_model_refs:
            return _relaxing_model_refs[annotation] | PlaceholderString
        return relax_model(annotation) | PlaceholderString

    # ---- Everything else (int, float, bool, HttpUrl, Path, …) --------
    return annotation | PlaceholderString


# - Model relaxation -------------------------------------------------


def _holds_placeholder(value: Any) -> bool:
    """Check the value is or carries a substitution placeholder.

    Parameters
    ----------
    value : Any
        Value to check, of any shape a config field takes.

    Returns
    -------
    bool
        Whether the value itself carries a substitution token or holds
        one at any depth.

    """
    if isinstance(value, str):
        # The loader's own notion of a token, so a value it will
        # substitute is not judged here before it does.
        return _SUBSTITUTION_RE.search(value) is not None

    if isinstance(value, BaseModel):
        return any(_holds_placeholder(v) for v in value.__dict__.values())

    if isinstance(value, dict):
        return any(
            _holds_placeholder(item) for pair in value.items() for item in pair
        )

    if isinstance(value, list | tuple | set | frozenset):
        return any(_holds_placeholder(v) for v in value)

    return False


def _relaxed_field_validator(
    func: Callable[..., Any],
    *,
    mode: str,
    relaxed_annotations: dict[str, Any],
) -> Callable[..., Any]:
    """Wrap a field validator so a placeholder leaves it unanswered.

    Parameters
    ----------
    func : Callable[..., Any]
        Validator of the original field.

    mode : str
        Pydantic field validator mode.

    relaxed_annotations : dict[str, Any]
        Relaxed type of each field the validator can receive.

    Returns
    -------
    Callable[..., Any]
        Validator that judges a concrete value and passes a placeholder
        to the relaxed field schema.

    """
    positional_count = sum(
        parameter.kind
        in (
            inspect.Parameter.POSITIONAL_ONLY,
            inspect.Parameter.POSITIONAL_OR_KEYWORD,
        )
        and parameter.default is inspect.Parameter.empty
        for parameter in inspect.signature(func).parameters.values()
    )
    accepts_info = positional_count == (3 if mode == 'wrap' else 2)

    if mode == 'wrap':

        def validate_wrap(
            value: Any,
            handler: Callable[[Any], Any],
            info: ValidationInfo,
        ) -> Any:
            if _holds_placeholder(value) or _holds_placeholder(info.data):
                return handler(value)

            if accepts_info:
                return func(value, handler, info)
            return func(value, handler)

        validate_wrap.__eventum_original_validator__ = func  # type: ignore[attr-defined]
        return validate_wrap

    def validate(
        value: Any,
        info: ValidationInfo,
    ) -> Any:
        if not (_holds_placeholder(value) or _holds_placeholder(info.data)):
            if accepts_info:
                return func(value, info)
            return func(value)

        if mode == 'plain':
            annotation = relaxed_annotations[cast('str', info.field_name)]
            adapter = TypeAdapter(annotation)
            adapter.rebuild(
                _types_namespace=_relaxed_forward_namespace,
            )
            return adapter.validate_python(value)

        return value

    validate.__eventum_original_validator__ = func  # type: ignore[attr-defined]
    return validate


def _relaxed_model_validator(
    func: Callable[..., Any],
    *,
    mode: str,
) -> Callable[..., Any]:
    """Wrap a model validator so a placeholder leaves it unanswered.

    Parameters
    ----------
    func : Callable[..., Any]
        Validator of the original model.

    mode : str
        Pydantic model validator mode.

    Returns
    -------
    Callable[..., Any]
        Validator that judges a config carrying no placeholder and
        passes over one that does.

    Notes
    -----
    A rule across fields cannot be answered while a field still stands
    for a value nobody has substituted yet - `left <= right` over a
    `${params.left}` is not a question with an answer. Such a config
    passes here and meets the rule at its own layer, where the config
    is loaded with the placeholders resolved.

    """

    @wraps(func)
    def validate(*args: Any, **kwargs: Any) -> Any:
        value = args[0]
        if not _holds_placeholder(value):
            return func(*args, **kwargs)

        if mode == 'wrap':
            handler = args[1]
            return handler(value)

        return value

    validate.__eventum_original_validator__ = func  # type: ignore[attr-defined]
    return validate


def _relax_validators(
    model_cls: type[BaseModel],
    relaxed_annotations: dict[str, Any],
) -> dict[str, Any]:
    """Take all field and model validators into a relaxed copy.

    Parameters
    ----------
    model_cls : type[BaseModel]
        Model to take the validators of.

    relaxed_annotations : dict[str, Any]
        Relaxed type of every field on the copied model.

    Returns
    -------
    dict[str, Any]
        Placeholder-aware validators to pass to `create_model`.

    Notes
    -----
    Each validator keeps its original mode. A field validator waits
    only when its own value carries a placeholder. A model validator
    waits when any value in the model carries one. Wrap validators still
    invoke the relaxed schema handler, so skipping a plugin rule never
    skips shape validation.

    """
    validators: dict[str, Any] = {
        name: field_validator(
            *decorator.info.fields,
            mode=decorator.info.mode,  # type: ignore[arg-type]
            check_fields=decorator.info.check_fields,
            json_schema_input_type=(
                _relax_type(decorator.info.json_schema_input_type)
                if decorator.info.json_schema_input_type
                is not PydanticUndefined
                else PydanticUndefined
            ),
        )(
            _relaxed_field_validator(
                decorator.func,
                mode=decorator.info.mode,
                relaxed_annotations=relaxed_annotations,
            ),
        )
        for name, decorator in (
            model_cls.__pydantic_decorators__.field_validators.items()
        )
    }
    validators.update(
        {
            name: model_validator(mode=decorator.info.mode)(
                _relaxed_model_validator(
                    decorator.func,
                    mode=decorator.info.mode,
                ),
            )
            for name, decorator in (
                model_cls.__pydantic_decorators__.model_validators.items()
            )
        },
    )
    return validators


def _build_relaxed_field(
    field_info: FieldInfo,
    relaxed_annotation: Any,
) -> tuple[Any, FieldInfo]:
    """Build a ``(annotation, FieldInfo)`` tuple for
    ``create_model``.

    Validation metadata has been folded into the type annotation by
    the caller, so it applies to the concrete branch rather than to
    ``PlaceholderString``. Other field attributes are preserved, apart
    from discriminators which cannot resolve a placeholder union.
    """
    relaxed_field_info = copy(field_info)
    relaxed_field_info.metadata = []
    relaxed_field_info.discriminator = None
    # A default factory may return an instance of the original nested
    # model, which is already validated but is not an instance of its
    # generated relaxed copy.
    if relaxed_field_info.validate_default:
        if relaxed_field_info.default_factory is not None:
            default_factory = relaxed_field_info.default_factory

            if relaxed_field_info.default_factory_takes_validated_data:
                factory_with_data = cast(
                    'Callable[[dict[str, Any]], Any]',
                    default_factory,
                )

                @wraps(factory_with_data)
                def factory(data: dict[str, Any]) -> Any:
                    return _normalize_default(factory_with_data(data))

            else:
                factory_without_data = cast(
                    'Callable[[], Any]',
                    default_factory,
                )

                @wraps(factory_without_data)
                def factory() -> Any:
                    return _normalize_default(factory_without_data())

            relaxed_field_info.default_factory = factory
        elif relaxed_field_info.default is not PydanticUndefined:
            relaxed_field_info.default = _normalize_default(
                relaxed_field_info.default,
            )
    return (relaxed_annotation, relaxed_field_info)


def _normalize_default(value: Any) -> Any:
    """Turn original model instances into input for relaxed copies."""
    if isinstance(value, RootModel):
        return _normalize_default(value.root)

    if isinstance(value, BaseModel):
        return {
            (
                field.validation_alias
                if isinstance(field.validation_alias, str)
                else field.alias or name
            ): _normalize_default(getattr(value, name))
            for name, field in value.__class__.model_fields.items()
        }

    if isinstance(value, dict):
        return {
            _normalize_default(key): _normalize_default(item)
            for key, item in value.items()
        }

    if isinstance(value, list | tuple | set | frozenset):
        return type(value)(_normalize_default(item) for item in value)

    return value


def _relaxed_model_config(model_cls: type[BaseModel]) -> ConfigDict:
    """Keep model behaviour while enforcing API model safeguards."""
    return cast(
        'ConfigDict',
        {
            **model_cls.model_config,
            'frozen': True,
            'extra': 'forbid',
        },
    )


def _finish_relaxed_model(
    model_cls: type[BaseModel],
    relaxed_cls: type[BaseModel],
) -> type[BaseModel]:
    """Register a relaxed model and resolve pending recursive fields."""
    reference = _relaxing_model_refs.pop(model_cls)
    _relaxed_model_cache[model_cls] = relaxed_cls
    _relaxed_forward_namespace[reference.__forward_arg__] = relaxed_cls

    for generated_cls in _relaxed_model_cache.values():
        generated_cls.model_rebuild(
            _types_namespace=_relaxed_forward_namespace,
            raise_errors=False,
        )

    return relaxed_cls


def relax_model(
    model_cls: type[BaseModel],
) -> type[BaseModel]:
    """Create a relaxed copy of *model_cls* where every non-string
    field also accepts ``PlaceholderString``.

    Results are cached so that shared models (e.g. formatter configs
    referenced by several output plugins) are only generated once.
    """
    if model_cls in _relaxed_model_cache:
        return _relaxed_model_cache[model_cls]

    reference_name = f'_EventumRelaxed_{id(model_cls)}'
    _relaxing_model_refs[model_cls] = ForwardRef(reference_name)
    model_namespace = vars(sys.modules[model_cls.__module__])

    # RootModel subclasses need special handling: they must remain
    # RootModel so that Pydantic transparently unwraps the ``root``
    # field (i.e. ``{"mode": "chance", ...}`` is accepted directly
    # without requiring ``{"root": {"mode": "chance", ...}}``).
    # The discriminator is intentionally dropped because relaxed union
    # members have non-Literal alternatives that break Pydantic's
    # discriminated union resolution.
    if issubclass(model_cls, RootModel):
        root_fi = model_cls.model_fields['root']
        root_annotation: Any = root_fi.annotation
        if root_fi.metadata:
            root_annotation = Annotated[root_annotation, *root_fi.metadata]
        relaxed_root_type = _relax_type(
            root_annotation,
            namespace=model_namespace,
        )
        root_annotations = {'root': relaxed_root_type}

        relaxed_root_cls = create_model(
            model_cls.__name__,
            __base__=model_cls,
            __config__=model_cls.model_config,
            __validators__=_relax_validators(
                model_cls,
                root_annotations,
            ),
            root=_build_relaxed_field(root_fi, relaxed_root_type),
        )
        return _finish_relaxed_model(model_cls, relaxed_root_cls)

    field_defs: dict[str, tuple[Any, FieldInfo]] = {}
    relaxed_annotations: dict[str, Any] = {}

    for name, fi in model_cls.model_fields.items():
        annotation: Any = fi.annotation

        # Move validation metadata into the annotation so it applies
        # only to the concrete branch of the relaxed union.
        if fi.metadata:
            annotation = Annotated[annotation, *fi.metadata]

        # Relax the (potentially annotated) type
        relaxed = _relax_type(
            annotation,
            namespace=model_namespace,
        )
        relaxed_annotations[name] = relaxed

        field_defs[name] = _build_relaxed_field(fi, relaxed)

    relaxed_cls: type[BaseModel] = create_model(  # type: ignore[call-overload]
        model_cls.__name__,
        **field_defs,  # type: ignore[arg-type]
        __base__=model_cls,
        __config__=_relaxed_model_config(model_cls),
        __validators__=_relax_validators(
            model_cls,
            relaxed_annotations,
        ),
    )

    return _finish_relaxed_model(model_cls, relaxed_cls)


# - API plugin config model generation -------------------------------


def _generate_api_plugin_config_models(
    plugin_type: Literal['input', 'event', 'output'],
) -> tuple[type[PluginNamedConfig], ...]:
    """Generate relaxed plugin configuration models.

    Mirrors
    :func:`runtime_types._generate_plugin_config_models`
    but wraps each plugin config with :func:`relax_model` first.
    """
    match plugin_type:
        case 'input':
            plugin_names = get_input_plugin_names()
            loader = load_input_plugin
        case 'event':
            plugin_names = get_event_plugin_names()
            loader = load_event_plugin
        case 'output':
            plugin_names = get_output_plugin_names()
            loader = load_output_plugin
        case t:
            assert_never(t)

    models: list[type[PluginNamedConfig]] = []
    for name in plugin_names:
        plugin = loader(name)
        relaxed_config = relax_model(plugin.config_cls)
        model = create_model(  # type: ignore[call-overload]
            name,
            **{name: (relaxed_config, ...)},  # type: ignore[arg-type]
            __base__=(PluginNamedConfig,),
        )
        models.append(model)

    return tuple(models)


# - Top-level types --------------------------------------------------

type ApiInputPluginNamedConfig = Union[  # type: ignore  # noqa: PGH003
    *_generate_api_plugin_config_models('input')  # type: ignore  # noqa: PGH003
]
type ApiEventPluginNamedConfig = Union[  # type: ignore  # noqa: PGH003
    *_generate_api_plugin_config_models('event')  # type: ignore  # noqa: PGH003
]
type ApiOutputPluginNamedConfig = Union[  # type: ignore  # noqa: PGH003
    *_generate_api_plugin_config_models('output')  # type: ignore  # noqa: PGH003
]


class ApiGeneratorConfig(BaseModel, extra='forbid', frozen=True):
    """Type-resolved generator config that also accepts placeholders.

    Attributes
    ----------
    input : list[ApiInputPluginNamedConfig]
        List of input plugin named configurations.

    event : ApiEventPluginNamedConfig
        Event plugin named configuration.

    output : list[ApiOutputPluginNamedConfig]
        List of output plugin named configurations.

    Notes
    -----
    Unlike ``runtime_types.GeneratorConfig`` which rejects placeholder
    strings, this model accepts ``${params.*}`` and ``${secrets.*}``
    in any field.  The OpenAPI schema still documents every plugin
    field with its original type.

    """

    input: list[ApiInputPluginNamedConfig]
    event: ApiEventPluginNamedConfig
    output: list[ApiOutputPluginNamedConfig]
