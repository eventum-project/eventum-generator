import signal
import time
from io import TextIOWrapper
from typing import Literal, TypeAlias

import click
import structlog
import yaml
from flatten_dict import unflatten  # type: ignore[import-untyped]
from pydantic import ValidationError
from setproctitle import setproctitle

import eventum.logging_config as logconf
from eventum.cli.pydantic_converter import from_model
from eventum.core.generator import Generator
from eventum.core.main import App, AppError
from eventum.core.models.parameters.generator import GeneratorParameters
from eventum.core.models.settings import Settings
from eventum.utils.validation_prettier import prettify_validation_errors

VerbosityLevel: TypeAlias = Literal[0, 1, 2, 3, 4, 5]

VERBOSITY_TO_LOG_LEVEL: dict[VerbosityLevel, logconf.LogLevel] = {
    1: 'CRITICAL',
    2: 'ERROR',
    3: 'WARNING',
    4: 'INFO',
    5: 'DEBUG',
}

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
    logconf.direct_to_stderr()

    try:
        data = yaml.load(config, Loader=yaml.SafeLoader)
    except yaml.error.YAMLError as e:
        logger.error(
            'Failed to parse configuration YAML content',
            reason=str(e)
        )
        exit(1)

    data = unflatten(data, splitter='dot')

    try:
        settings = Settings.model_validate(data)
    except ValidationError as e:
        logger.error(
            'Failed to validate settings',
            reason=prettify_validation_errors(e.errors())
        )
        exit(1)

    logconf.configure_for_stderr_and_file(
        format=settings.log.format,
        level=settings.log.level.upper(),   # type: ignore[arg-type]
        logs_dir=settings.path.logs,
        log_basename='main'
    )

    app = App(settings)

    try:
        app.start()
    except AppError as e:
        logger.error(str(e), **e.context)
        exit(1)

    def handle_termination(signal_num):
        logger.info(f'{signal.Signals(signal_num).name} signal is received')
        app.stop()
        exit(1)

    signal.signal(signal.SIGINT, lambda sig, __: handle_termination(sig))
    signal.signal(signal.SIGTERM, lambda sig, __: handle_termination(sig))
    signal.pause()


@cli.command
@from_model(GeneratorParameters)
@click.option(
    '-v', '--verbose',
    count=True,
    type=click.IntRange(0, 5),
    default=0,
    show_default=True,
    help=(
        'Level of verbosity for printed logs '
        '(default: disabled, -v: critical, -vv: errors, '
        '-vvv: warnings, -vvvv: info, -vvvvv: debug)'
    )
)
@click.option(
    '-m', '--metrics-interval',
    type=click.FloatRange(min=1),
    default=30,
    show_default=True,
    help='Time interval (in seconds) of metrics gauging'
)
def generate(
    generator_parameters: GeneratorParameters,
    verbose: VerbosityLevel,
    metrics_interval: float
) -> None:
    """Generate events using single generator."""
    if verbose > 0:
        logconf.direct_to_stderr(level=VERBOSITY_TO_LOG_LEVEL[verbose])
    else:
        logconf.disable()

    generator = Generator(generator_parameters)
    generator.start()

    def handle_termination(signal_num: int):
        logger.info(f'{signal.Signals(signal_num).name} signal is received')
        generator.stop()

        metrics = generator.get_metrics()
        logger.info('Publishing eventual metrics', metrics=metrics)

        exit(128 + signal_num)

    signal.signal(signal.SIGINT, lambda sig, __: handle_termination(sig))
    signal.signal(signal.SIGTERM, lambda sig, __: handle_termination(sig))

    last_metrics_time = time.monotonic()

    while generator.is_running:
        current_time = time.monotonic()
        if (current_time - last_metrics_time) > metrics_interval:
            last_metrics_time = current_time
            metrics = generator.get_metrics()
            logger.info('Publishing actual metric', metrics=metrics)

        time.sleep(0.1)

    logger.info('Generator ended execution')
    exit(0)


if __name__ == '__main__':
    cli()
