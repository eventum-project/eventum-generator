"""Commands for managing keyring."""

import sys
from pathlib import Path
from typing import Any

import click
from pwinput import pwinput  # type: ignore[import-untyped]
from setproctitle import setproctitle

from eventum.security.manage import get_secret, remove_secret, set_secret

setproctitle('eventum-keyring')


@click.group('eventum-keyring')
def cli() -> Any:
    """Tool for managing keyring secrets."""


@cli.command()
@click.argument('name')
@click.option(
    '--cryptfile',
    default=None,
    type=click.Path(exists=True, resolve_path=True),
    help='Path to keyring cryptfile',
)
def get(name: str, cryptfile: str | None) -> None:
    """Get secret from keyring."""
    try:
        if cryptfile is None:
            secret = get_secret(name=name)
        else:
            secret = get_secret(name=name, path=Path(cryptfile))

        click.echo(secret)
    except (OSError, ValueError) as e:
        click.echo(f'Error: {e}', err=True)
        sys.exit(1)


@cli.command()
@click.argument('name')
@click.argument('value', default=None, required=False)
@click.option(
    '--cryptfile',
    default=None,
    type=click.Path(resolve_path=True),
    help='Path to keyring cryptfile',
)
def set(name: str, value: str | None, cryptfile: str | None) -> None:
    """Set secret to keyring."""
    if value is None:
        value = pwinput(f'Enter password of `{name}`: ')

    try:
        if cryptfile is None:
            set_secret(name=name, value=value)
        else:
            set_secret(name=name, value=value, path=Path(cryptfile))
    except ValueError as e:
        click.echo(f'Error: {e}', err=True)
        sys.exit(1)
    except OSError as e:
        click.echo(f'Error: {e}', err=True)
        sys.exit(1)
    else:
        click.echo('Done', err=True)


@cli.command()
@click.argument('name')
@click.option(
    '--cryptfile',
    default=None,
    type=click.Path(exists=True, resolve_path=True),
    help='Path to keyring cryptfile',
)
def remove(name: str, cryptfile: str | None) -> None:
    """Remove secret from keyring."""
    try:
        if cryptfile is None:
            remove_secret(name=name)
        else:
            remove_secret(name=name, path=Path(cryptfile))
    except ValueError as e:
        click.echo(f'Error: {e}', err=True)
        sys.exit(1)
    except OSError as e:
        click.echo(f'Error: {e}', err=True)
        sys.exit(1)
    else:
        click.echo('Done', err=True)


if __name__ == '__main__':
    cli()
