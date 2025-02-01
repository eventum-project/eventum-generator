import click
from pydanclick import from_pydantic
from pydantic import ValidationError  # type: ignore[import-untyped]

from eventum.core.models.parameters.generator import GeneratorParameters
from eventum.utils.validation_prettier import prettify_validation_errors


@click.group('eventum')
def _cli():
    """Events generation platform."""
    pass


@_cli.command
@click.option(
    '-c', '--config',
    required=True,
    help='Path to main configuration file'
)
def run(config: str) -> None:
    """Run application with all defined generators."""
    print(config)


@_cli.command
@from_pydantic(
    GeneratorParameters,
    parse_docstring=True,
    docstring_style='numpy'
)
def generate(generator_parameters: GeneratorParameters) -> None:
    """Generate events using single generator."""
    pass


def cli():
    try:
        _cli()
    except ValidationError as e:
        click.echo(
            'Error: Parameters validation failed: '
            + prettify_validation_errors(e.errors())
        )
        exit(1)


if __name__ == '__main__':
    cli()
