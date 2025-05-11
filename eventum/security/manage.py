"""Module for securely storing and retrieving secrets using a keyring."""

import os
from functools import lru_cache
from pathlib import Path

import keyrings.cryptfile.cryptfile as crypt  # type: ignore[import-untyped]
import structlog

DEFAULT_PASSWORD = 'eventum'  # noqa: S105
KEYRING_PASS_ENV_VAR = 'EVENTUM_KEYRING_PASSWORD'  # noqa: S105
KEYRING_SERVICE_NAME = 'eventum'


logger = structlog.stdlib.get_logger()


@lru_cache
def get_keyring_password() -> str:
    """Get password for keyring.

    Password is searched in environment variable first, otherwise
    default password will be returned.

    Returns
    -------
    str
        Password for keyring.

    """
    password = os.getenv(KEYRING_PASS_ENV_VAR)

    if password is None:
        password = DEFAULT_PASSWORD
        logger.warning(
            'Environment variable with keyring password is not set, '
            'using default password for keyring',
        )

    return password


def get_secret(name: str, path: Path | None = None) -> str:
    """Get secret from keyring.

    Parameters
    ----------
    name : str
        Name of the secret.

    path : Path | None, default=None
        Path to keyring file, default location is used if none is
        provided.

    Returns
    -------
    str
        Secret.

    Raises
    ------
    ValueError
        If name of secret is blank or missing in keyring.

    EnvironmentError
        If any error occurs during obtaining secret from keyring.

    """
    logger.info('Secret is accessed', secret=name)
    if not name:
        msg = 'Name of secret cannot be blank'
        raise ValueError(msg)

    keyring = crypt.CryptFileKeyring()

    if path is not None:
        keyring.file_path = path  # type: ignore[assignment]

    keyring.keyring_key = get_keyring_password()

    try:
        secret = keyring.get_password(
            service=KEYRING_SERVICE_NAME,
            username=name,
        )
    except Exception as e:
        raise OSError(e) from e

    if secret is None:
        msg = 'Secret is missing'
        raise ValueError(msg)

    return secret


def set_secret(name: str, value: str, path: Path | None = None) -> None:
    """Set secret to keyring under specified name.

    Parameters
    ----------
    name : str
        Name of the secret.

    value : str
        Value of the secret.

    path : Path | None, default=None
        Path to keyring file, default location is used if none is
        provided.

    Raises
    ------
    ValueError
        If name or value of secret are blank.

    EnvironmentError
        If any error occurs during setting secret to keyring.

    """
    logger.info('Secret is set', secret=name)

    if not name or not value:
        msg = 'Name and value of secret cannot be empty'
        raise ValueError(msg)

    keyring = crypt.CryptFileKeyring()

    if path is not None:
        keyring.file_path = path  # type: ignore[assignment]

    keyring.keyring_key = get_keyring_password()

    try:
        keyring.set_password(  # type: ignore[call-arg]
            system=KEYRING_SERVICE_NAME,
            username=name,
            password=value,
        )
    except Exception as e:
        raise OSError(e) from e


def remove_secret(name: str, path: Path | None = None) -> None:
    """Remove secret from keyring.

    Parameters
    ----------
    name : str
        Name of the secret to remove.

    path : Path | None, default=None
        Path to keyring file, default location is used if none is
        provided.

    Raises
    ------
    ValueError
        If name of secret is blank.

    EnvironmentError
        If any error occurs during removing secret from keyring.

    """
    logger.info('Secret is removed', secret=name)

    if not name:
        msg = 'Name of secret cannot be blank'
        raise ValueError(msg)

    keyring = crypt.CryptFileKeyring()

    if path is not None:
        keyring.file_path = path  # type: ignore[assignment]

    keyring.keyring_key = get_keyring_password()

    try:
        keyring.delete_password(
            service=KEYRING_SERVICE_NAME,
            username=name,
        )
    except Exception as e:
        raise OSError(e) from e
