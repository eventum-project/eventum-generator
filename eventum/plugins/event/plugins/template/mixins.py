"""Mixins for configuration models."""

from typing import Any

from pydantic import field_validator


class TemplateAliasesUniquenessValidatorMixin:
    """Mixin for validation aliases uniqueness in templates list."""

    @field_validator('templates')
    @classmethod
    def validate_template_aliases_uniqueness(  # noqa: D102
        cls,
        v: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        aliases: set[str] = set()

        for item in v:
            keys = item.keys()

            duplicated_keys = aliases.intersection(keys)
            if duplicated_keys:
                msg = f'Template alias `{duplicated_keys.pop()}` is duplicated'
                raise ValueError(msg)

            aliases.update(keys)

        return v


class TemplateSingleItemElementsValidatorMixin:
    """Mixin for validation that each element of templates list is a
    dictionary with only one element.
    """

    @field_validator('templates')
    @classmethod
    def validate_template_single_item_elements(  # noqa: D102
        cls,
        v: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        for item in v:
            if len(item) != 1:
                msg = 'Each element must include exactly one key'
                raise ValueError(msg)

        return v
