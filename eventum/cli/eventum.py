import os
from io import TextIOWrapper

import click
import structlog
import yaml
from flatten_dict import unflatten  # type: ignore[import-untyped]
from pydantic import ValidationError
from setproctitle import setproctitle

from eventum.cli.pydantic.converter import from_model
from eventum.core.main import App, AppError
from eventum.core.models.parameters.generator import GeneratorParameters
from eventum.core.models.settings import Settings
from eventum.utils.validation_prettier import prettify_validation_errors

setproctitle('eventum')
logger = structlog.stdlib.get_logger()


@click.group('eventum')
def cli():
    """Events generation platform."""
    pass


@cli.command
@click.option(
    '-c', '--config',
    required=True,
    help='Path to main configuration file',
    type=click.File()
)
def run(config: TextIOWrapper) -> None:
    """Run application with all defined generators."""
    try:
        data = yaml.load(config, Loader=yaml.SafeLoader)
    except yaml.error.YAMLError as e:
        click.echo(
            f'Error: Failed to parse configuration: {str(e).capitalize()}',
            err=True
        )
        exit(1)

    data = unflatten(data, splitter='dot')

    try:
        settings = Settings.model_validate(data)
    except ValidationError as e:
        click.echo('Error: Failed to validate options:', err=True)
        click.echo(
            prettify_validation_errors(e.errors(), sep=os.linesep),
            err=True
        )
        exit(1)

    app = App(settings)

    try:
        app.start()
    except AppError as e:
        logger.error(str(e), **e.context)
        click.echo(
            f'Error: App exited with error: {e} (see logs for more info)',
            err=True
        )
        exit(1)


@cli.command
@from_model(GeneratorParameters)
def generate(generator_parameters: GeneratorParameters) -> None:
    """Generate events using single generator."""
    print(generator_parameters)
    # TODO: implement


if __name__ == '__main__':
    cli()
