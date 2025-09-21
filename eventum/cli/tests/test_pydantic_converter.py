import click
from click.testing import CliRunner
from pydantic import BaseModel

from eventum.cli.pydantic_converter import from_model


class Config(BaseModel):
    """Config.

    Attributes
    ----------
    name : str
        User name.
    """

    name: str


@click.command()
@from_model(Config)
def cli(config: Config):
    click.echo(f'Hello {config.name}')


def test_cli_valid():
    runner = CliRunner()
    result = runner.invoke(cli, ['--name', 'Alice'])
    assert result.exit_code == 0
    assert 'Hello Alice' in result.output


def test_cli_invalid():
    runner = CliRunner()
    result = runner.invoke(cli, [])
    assert result.exit_code != 0
    assert "Missing option '--name'" in result.output


def test_parse_docstring_extracts_field_doc():
    runner = CliRunner()
    result = runner.invoke(cli, ['--help'])
    assert result.exit_code == 0
    assert 'User name' in result.output
