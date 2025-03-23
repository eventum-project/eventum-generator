"""Functions for application configuration loading."""

import re
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import yaml
from jinja2 import BaseLoader, Environment, TemplateSyntaxError
from pydantic import ValidationError

from eventum.core.models.config import GeneratorConfig
from eventum.exceptions import ContextualError
from eventum.security.manage import get_secret
from eventum.utils.validation_prettier import prettify_validation_errors

TOKEN_PATTERN = re.compile(pattern=r'\${\s*?(\S*?)\s*?}')


class ConfigurationLoadError(ContextualError):
    """Error during loading generator configuration."""


def _extract_tokens(content: str, prefix: str | None = None) -> list[str]:
    """Extract tokens enclosed within `${}` from the given content.

    Parameters
    ----------
    content : str
        Content to search for tokens.

    prefix : str | None, default=None
        Prefix to filter tokens (the part before the first dot), if not
        provided, all tokens will be extracted.

    Returns
    -------
    list[str]
        List of extracted tokens.

    """
    matches: list[str] = re.findall(pattern=TOKEN_PATTERN, string=content)

    if not matches:
        return []

    if prefix is None:
        return matches

    tokens: list[str] = []
    for match in matches:
        parts = match.split('.', maxsplit=1)

        if len(parts) == 2 and parts[0] == prefix:  # noqa: PLR2004
            tokens.append(match)

    return tokens


def extract_params(content: str) -> list[str]:
    """Extract param names from configuration content.

    Parameters
    ----------
    content : str
        Content of configuration.

    Returns
    -------
    list[str]
        List of extracted param names.

    """
    tokens = _extract_tokens(content, prefix='params')

    if not tokens:
        return []

    params: list[str] = []
    for token in tokens:
        _, name = token.split('.', maxsplit=1)
        params.append(name)

    return params


def extract_secrets(content: str) -> list[str]:
    """Extract secret names from configuration content.

    Parameters
    ----------
    content : str
        Content of configuration.

    Returns
    -------
    list[str]
        List of extracted secret names.

    """
    tokens = _extract_tokens(content, prefix='secrets')

    if not tokens:
        return []

    secrets: list[str] = []
    for token in tokens:
        _, name = token.split('.', maxsplit=1)
        secrets.append(name)

    return secrets


def _prepare_params(
    used_params: Iterable[str],
    provided_params: dict[str, Any],
) -> dict[str, Any]:
    """Prepare params for config substitution.

    Parameters
    ----------
    used_params : Iterable[str]
        Param names used in substitution.

    provided_params : dict[str, Any]
        Params provided by user.

    Returns
    -------
    dict[str, Any]
        Params prepared for substitution.

    Raises
    ------
    ValueError
        If some parameters are missing.

    """
    used_params = set(used_params)
    rendering_params: dict[str, Any] = {}

    if used_params:
        all_params = set(provided_params.keys())

        if not all_params.issuperset(used_params):
            missing_params = used_params - all_params
            msg = f'Parameters {missing_params} are missing'
            raise ValueError(msg)

        for param in used_params:
            rendering_params[param] = provided_params[param]

    return rendering_params


def _prepare_secrets(used_secrets: Iterable[str]) -> dict[str, Any]:
    """Prepare secrets for config substitution.

    Parameters
    ----------
    used_secrets : Iterable[str]
        Secret names used in substitution.

    Returns
    -------
    dict[str, Any]
        Secrets prepared for substitution.

    Raises
    ------
    ValueError
        If some secrets are missing or cannot be read from keyring.

    """
    used_secrets = set(used_secrets)
    rendering_secrets: dict[str, Any] = {}

    if used_secrets:
        for secret in used_secrets:
            try:
                value = get_secret(secret)
            except (OSError, ValueError) as e:
                msg = f'Cannot obtain secret `{secret}`: {e}'
                raise ValueError(msg) from None

            rendering_secrets[secret] = value

    return rendering_secrets


def _substitute_tokens(
    params: dict[str, Any],
    secrets: dict[str, Any],
    content: str,
) -> str:
    """Substitute tokens to content of configuration.

    Parameters
    ----------
    params : dict[str, Any]
        Params.

    secrets : dict[str, Any]
        Secrets.

    content : str
        Content of configuration.

    Returns
    -------
    str
        Content of configuration with substituted tokens.

    Raises
    ------
    ValueError
        If any error occurs during tokens substitution.

    """
    rendering_kwargs = {
        'params': params,
        'secrets': secrets,
    }
    env = Environment(
        loader=BaseLoader(),
        variable_start_string='${',
        variable_end_string='}',
    )
    try:
        template = env.from_string(content)
        return template.render(rendering_kwargs)
    except TemplateSyntaxError as e:
        msg = (
            f'Tokens substitution structure is malformed: {e} '
            f'(line {e.lineno})'
        )
        raise ValueError(msg) from e
    except Exception as e:
        raise ValueError(str(e)) from e


def load(path: Path, params: dict[str, Any]) -> GeneratorConfig:
    """Load generator configuration from the file on specified path.

    Parameters
    ----------
    path : Path
        Configuration path.

    params : dict[str, Any]
        Parameters to substitute in configuration content.

    Returns
    -------
    GeneratorConfig
        Loaded generator configuration.

    Raises
    ------
    ConfigurationLoadError
        If configuration cannot be loaded.

    """
    try:
        with path.open() as f:
            content = f.read()
    except OSError as e:
        msg = 'Failed to read configuration file'
        raise ConfigurationLoadError(
            msg,
            context={'reason': str(e), 'file_path': path},
        ) from None

    try:
        rendering_params = _prepare_params(
            used_params=extract_params(content),
            provided_params=params,
        )
    except ValueError as e:
        msg = 'Failed to substitute params to configuration'
        raise ConfigurationLoadError(
            msg,
            context={'reason': str(e), 'file_path': path},
        ) from None

    try:
        rendering_secrets = _prepare_secrets(
            used_secrets=extract_secrets(content),
        )
    except ValueError as e:
        msg = 'Failed to substitute secrets to configuration'
        raise ConfigurationLoadError(
            msg,
            context={'reason': str(e), 'file_path': path},
        ) from None

    try:
        substituted_content = _substitute_tokens(
            params=rendering_params,
            secrets=rendering_secrets,
            content=content,
        )
    except ValueError as e:
        msg = 'Failed to substitute tokens to configuration'
        raise ConfigurationLoadError(
            msg,
            context={
                'reason': str(e),
                'file_path': path,
            },
        ) from None

    try:
        config_data = yaml.load(substituted_content, yaml.SafeLoader)
    except yaml.error.YAMLError as e:
        msg = 'Failed to parse configuration YAML content'
        raise ConfigurationLoadError(
            msg,
            context={
                'reason': str(e),
                'file_path': path,
            },
        ) from None

    try:
        return GeneratorConfig.model_validate(config_data)
    except ValidationError as e:
        msg = 'Invalid configuration'
        raise ConfigurationLoadError(
            msg,
            context={
                'reason': prettify_validation_errors(e.errors()),
                'file_path': path,
            },
        ) from None
