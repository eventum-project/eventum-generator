import click
from pwinput import pwinput  # type: ignore[import-untyped]
from setproctitle import setproctitle

from eventum.security.manage import get_secret, remove_secret, set_secret

setproctitle('eventum-keyring')


@click.group('eventum-keyring')
def cli():
    """Tool for managing keyring secrets."""
    pass


@cli.command()
@click.argument('name')
def get(name: str) -> None:
    """Get secret from keyring."""
    try:
        secret = get_secret(name=name)
        click.echo(secret)
    except (ValueError, EnvironmentError) as e:
        click.echo(f'Error: {e}', err=True)
        exit(1)


@cli.command()
@click.argument('name')
@click.argument('value', default=None, required=False)
def set(name: str, value: str | None) -> None:
    """Set secret to keyring."""
    if value is None:
        value = pwinput(f'Enter password of "{name}": ')

    try:
        set_secret(name=name, value=value)
    except ValueError as e:
        click.echo(f'Error: {e}', err=True)
        exit(1)
    except EnvironmentError as e:
        click.echo(f'Error: {e}', err=True)
        exit(1)
    else:
        click.echo('Done', err=True)


@cli.command()
@click.argument('name')
def remove(name: str) -> None:
    """Remove secret from keyring."""
    try:
        remove_secret(name=name)
    except ValueError as e:
        click.echo(f'Error: {e}', err=True)
        exit(1)
    except EnvironmentError as e:
        click.echo(f'Error: {e}', err=True)
        exit(1)
    else:
        click.echo('Done', err=True)


if __name__ == '__main__':
    cli()
