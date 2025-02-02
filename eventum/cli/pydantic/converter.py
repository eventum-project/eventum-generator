import functools
import os
from types import NoneType, UnionType
from typing import Any, Callable, Literal, Sequence, get_args, get_origin

import click.types as click_types
from click import Command, Option, echo
from flatten_dict import unflatten  # type: ignore[import-untyped]
from griffe import (Docstring, DocstringAttribute, DocstringSectionAttributes,
                    parse_numpy)
from pydantic import BaseModel, ValidationError
from pydantic.fields import FieldInfo
from pydantic_core import ErrorDetails, PydanticUndefined

from eventum.utils.validation_prettier import prettify_validation_errors


def _parse_docstring(model: type[BaseModel]) -> dict[str, str]:
    """Parse model docstring.

    Parameters
    ----------
    model : type[BaseModel]
        Model the documentation of which should be parsed

    Returns
    -------
    dict[str, str]
        Map with attribute names in keys and their descriptions in
        values
    """
    class_docs: list[str] = []
    for cls in [model, *model.__bases__]:
        if (
            issubclass(cls, BaseModel)
            and cls is not BaseModel
            and cls.__doc__ is not None
        ):
            class_docs.append(cls.__doc__)

    field_docs: dict[str, str] = dict()

    for doc in class_docs:
        docstring = parse_numpy(docstring=Docstring(doc))

        for section in docstring:
            if not isinstance(section, DocstringSectionAttributes):
                continue
            for attribute in section.value:
                if not isinstance(attribute, DocstringAttribute):
                    continue

                field_docs[attribute.name] = attribute.description

    return field_docs


def build_arg_name(fields_stack: list[str]) -> str:
    """Build argument name for click.Option.

    Parameters
    ----------
    fields_stack : list[str]
        Field names stack

    Returns
    -------
    Argument name including all stack of field names

    Raises
    ------
    ValueError
        If fields stack is empty
    """
    if not fields_stack:
        raise ValueError('At least one field must be in the stack')

    return '__'.join(fields_stack)


def build_option_name(fields_stack: list[str]) -> str:
    """Build option name for click.Option.

    Parameters
    ----------
    fields_stack : list[str]
        Field names stack

    Returns
    -------
    Option name including all stack of field names

    Raises
    ------
    ValueError
        If fields stack is empty
    """
    if not fields_stack:
        raise ValueError('At least one field must be in the stack')

    return '--' + '.'.join(fields_stack).replace('_', '-')


def build_object_from_args(**kwargs: Any) -> dict[str, Any]:
    """Build object from command options given as arguments.
    Unflattening of arguments is performed using reversed logic of
    `build_arg_name` function.

    Parameters
    ----------
    **kwargs : Any
        Command options as keyword arguments

    Returns
    -------
    dict[str, Any]
        Unflattened object that is built of arguments
    """
    flat_object = {
        key.replace('__', '.'): value
        for key, value in kwargs.items()
    }
    return unflatten(flat_object, splitter='dot')


def _get_type_for_annotation(
    annotation: type[Any] | None
) -> type | click_types.ParamType | None:
    """Get click compatible type from annotation.

    Parameters
    ----------
    annotation : type[Any] | None
        Annotation to convert to click type

    Returns
    -------
    type | click_types.ParamType | None
        Python type or click parameter type
    """
    origin_type = get_origin(annotation)
    type_args = get_args(annotation)

    if (
        origin_type is UnionType
        and len(type_args) == 2
        and NoneType in type_args
    ):
        return next(arg for arg in type_args if arg is not NoneType)
    elif origin_type is Literal:
        return click_types.Choice(type_args)
    else:
        return annotation


def _create_option(
    decls: Sequence[str],
    description: str | None,
    field_info: FieldInfo
) -> Option:
    """Create `click.Option` from pydantic `FieldInfo` object.

    Parameters
    ----------
    decls : Sequence[str]
        Option declarations

    description : str | None
        Option description that is used when description is not defined
        in field info

    field_info : FieldInfo
        Pydantic field info

    Returns
    -------
    click.Option
        Click option
    """
    default: Any | None = None
    show_default = False
    required = True

    if field_info.default is not PydanticUndefined:
        default = field_info.default
        show_default = True
        required = False

    if field_info.default_factory is not None:
        default = field_info.default_factory
        show_default = False
        required = False

    if field_info.description is not None:
        description = field_info.description

    type = _get_type_for_annotation(field_info.annotation)

    return Option(
        param_decls=decls,
        show_default=show_default,
        default=default,
        required=required,
        help=description,
        type=type
    )


def _convert_to_options(
    fields_stack: list[str],
    model: type[BaseModel]
) -> list[Option]:
    """Convert Pydantic model to list of Click options.

    Parameters
    ----------
    fields_stack : list[str]
        Current stack of field names

    model : type[BaseModel]
        Pydantic model

    Returns
    -------
    list[Option]
        List of click options
    """
    options: list[Option] = []

    field_docs = _parse_docstring(model)

    for name, info in model.__pydantic_fields__.items():
        fields_stack.append(name)
        cls = info.annotation

        if isinstance(cls, type) and issubclass(cls, BaseModel):
            options.extend(_convert_to_options(fields_stack, cls))
        else:
            arg_name = build_arg_name(fields_stack)
            option_name = build_option_name(fields_stack)

            option = _create_option(
                decls=(option_name, arg_name),
                description=field_docs.get(name, None),
                field_info=info
            )
            options.append(option)

        fields_stack.pop()

    return options


def add_options(
    _f_or_opts: Callable | list[Option],
    options: list[Option] | None = None
) -> Callable:
    """Add list of options to a function."""
    if callable(_f_or_opts):
        if options is None:
            raise ValueError('No options specified')

        return _register_options(_f_or_opts, options)

    def wrapper(_f: Callable) -> Callable:
        return add_options(_f, _f_or_opts)

    return wrapper


def _register_options(
    f: Callable,
    options: list[Option]
) -> Callable:
    """Register options using Click internal mechanism."""
    ordered_options = reversed(options)

    if isinstance(f, Command):
        f.params.extend(ordered_options)
    else:
        if not hasattr(f, "__click_params__"):
            f.__click_params__ = []     # type: ignore[attr-defined]

        f.__click_params__.extend(      # type: ignore[attr-defined]
            ordered_options
        )

    return f


def _patch_error_locations(errors: list[ErrorDetails]) -> None:
    """Patch error locations to match option names when printing
    validation errors.

    Parameters
    ----------
    errors : list[ErrorDetails]
        Errors list to patch in place
    """
    for error in errors:
        new_locs: list[str | int] = []
        for i, level in enumerate(error['loc']):
            if isinstance(level, str):
                level = level.replace('_', '-')
                if i == 0:
                    level = '--' + level

            new_locs.append(level)

        error['loc'] = tuple(new_locs)


def from_model(model: type[BaseModel]) -> Callable[[Callable], Callable]:
    """Decorator for adding options to click command from pydantic
    model.
    """
    options = _convert_to_options(fields_stack=[], model=model)

    def wrapper(f: Callable) -> Callable:
        @add_options(options)
        @functools.wraps(f)
        def wrapped(**kwargs: Any) -> Any:
            object = build_object_from_args(**kwargs)
            try:
                validated = model.model_validate(object)
            except ValidationError as e:
                errors = e.errors()
                _patch_error_locations(errors)

                echo('Error: Failed to validate options:')
                echo(prettify_validation_errors(errors, sep=os.linesep))

                exit(1)

            return f(validated)

        return wrapped

    return wrapper
