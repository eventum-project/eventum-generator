import os
import signal
import time
from io import TextIOWrapper

import click
import structlog
import yaml
from flatten_dict import unflatten  # type: ignore[import-untyped]
from pydantic import ValidationError
from setproctitle import setproctitle

from eventum.cli.pydantic_converter import from_model
from eventum.core.generator import Generator
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

    def handle_termination():
        logger.info('Termination signal is received')
        app.stop()
        exit(0)

    signal.signal(signal.SIGINT, lambda _, __: handle_termination())
    signal.signal(signal.SIGTERM, lambda _, __: handle_termination())
    signal.pause()


@cli.command
@from_model(GeneratorParameters)
@click.option(
    '-v', '--verbose',
    is_flag=True,
    show_default=True,
    default=False,
    help='Whether to show generator logs'
)
def generate(
    generator_parameters: GeneratorParameters,
    verbose: bool = False
) -> None:
    """Generate events using single generator."""
    generator = Generator(generator_parameters)
    generator.start()

    def handle_termination():
        logger.info('Termination signal is received')
        generator.stop()
        generator.join(timeout=1)

        if generator.is_running:
            generator.force_stop()

        metrics = generator.get_metrics()
        if metrics is not None:
            logger.info('Publishing eventual metrics', metrics=metrics)
        else:
            logger.info('No eventual metrics to publish')

        exit(generator.exit_code)

    signal.signal(signal.SIGINT, lambda _, __: handle_termination())
    signal.signal(signal.SIGTERM, lambda _, __: handle_termination())

    last_metrics_time = time.monotonic()
    interval = generator_parameters.metrics_interval

    while generator.is_running:
        current_time = time.monotonic()
        if (current_time - last_metrics_time) > interval:
            last_metrics_time = current_time
            metrics = generator.get_metrics()
            if metrics is not None:
                logger.info('Publishing actual metric', metrics=metrics)
            else:
                logger.info('No metric to publish yet')

        time.sleep(0.1)

    logger.info('Generator ended execution')


if __name__ == '__main__':
    cli()
