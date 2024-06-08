import argparse
import json
import logging
from concurrent.futures import Future, ProcessPoolExecutor
from importlib.metadata import version
from typing import TypedDict

from eventum_content_manager.manage import (ContentManagementError,
                                            load_app_config,
                                            load_compose_config)
from eventum_core.app import Application
from eventum_core.settings import Settings, TimeMode
from pydantic import BaseModel, Field, ValidationError

import eventum_cli.logging_config as logging_config
from eventum_cli.cli_main import ApplicationConfig
from eventum_cli.config_finalizer import substitute_tokens
from eventum_cli.resolver import resolve_config_path
from eventum_cli.validation_prettier import prettify_errors

VERSION = version('eventum_cli')
logger: logging.Logger | None = None


class ComposeGeneratorConfig(BaseModel, frozen=True, extra='forbid'):
    config: str = Field(..., min_length=1)
    time_mode: TimeMode
    params: dict
    settings: dict


class ApplicationKwargs(TypedDict):
    config: ApplicationConfig
    time_mode: TimeMode
    settings: Settings


class ComposeConfig(BaseModel, frozen=True, extra='forbid'):
    generators: dict[str, ComposeGeneratorConfig] = Field(..., min_length=1)


def run_app(*args, **kwargs) -> None:
    """Run the application with specified arguments."""
    Application(*args, **kwargs).start()


def _initialize_argparser(argparser: argparse.ArgumentParser) -> None:
    """Add arguments for initial argparser object."""

    parse_as_dict = json.loads
    parse_as_dict.__name__ = 'json parse'

    argparser.add_argument(
        '-c', '--config',
        required=True,
        help='Compose file'
    )
    argparser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable all informational messages in output'
    )
    argparser.add_argument(
        '-V', '--version',
        action='version',
        version=f'eventum-compose {VERSION}'
    )


def main() -> None:
    argparser = argparse.ArgumentParser(
        prog='eventum-compose',
        description='Compose util for Eventum',
        epilog='Documentation: https://eventum-generatives.github.io/Website/',
    )

    _initialize_argparser(argparser)

    args = argparser.parse_args()

    if args.verbose:
        logging_config.apply(stderr_level=logging.INFO)
    else:
        logging_config.apply()

    logger = logging.getLogger(__name__)

    logger.info('Eventum compose is started')

    logger.info(f'Resolving location of compose file "{args.config}"')
    config_path = resolve_config_path(args.config)

    try:
        raw_config_data = load_compose_config(config_path)
    except ContentManagementError as e:
        logger.error(f'Failed to load compose file: {e}')
        exit(1)

    try:
        config = ComposeConfig.model_validate(raw_config_data)
    except ValidationError as e:
        error_message = prettify_errors(e.errors())
        logger.error(f'Failed to read compose file: {error_message}')
        exit(1)

    apps_kwargs: list[ApplicationKwargs] = []

    for generator_name, generator_config in config.generators.items():
        logger.info(f'Initializing generator "{generator_name}"')
        logger.info(
            f'Resolving location of config file "{generator_config.config}"'
        )
        config_path = resolve_config_path(generator_config.config)

        try:
            raw_config_data = load_app_config(config_path)
        except ContentManagementError as e:
            logger.error(
                f'Failed to load config file '
                f'for generator "{generator_name}": {e}'
            )
            exit(1)

        try:
            final_config_data = substitute_tokens(
                config=raw_config_data,
                params=generator_config.params
            )
        except ValueError as e:
            logger.error(
                'Failed to substitute tokens to config'
                f'for generator "{generator_name}": {e}'
            )
            exit(1)

        try:
            app_config = ApplicationConfig.model_validate(final_config_data)
        except ValidationError as e:
            error_message = prettify_errors(e.errors())
            logger.error(
                'Failed to read config file '
                f'for generator "{generator_name}": {error_message}'
            )
            exit(1)

        try:
            settings = Settings(**generator_config.settings)
        except ValidationError as e:
            error_message = prettify_errors(e.errors())
            logger.error(
                'Incorrect settings '
                f'for generator "{generator_name}": {error_message}'
            )
            exit(1)

        apps_kwargs.append(
            {
                'config': app_config,
                'time_mode': TimeMode(generator_config.time_mode),
                'settings': settings
            }
        )

    logger.info(
        f'Starting {list(config.generators.keys())} generators in process pool'
    )

    tasks: list[tuple[str, Future]] = []
    with ProcessPoolExecutor(max_workers=len(apps_kwargs)) as executor:
        for name, kwargs in zip(config.generators.keys(), apps_kwargs):
            tasks.append(
                (name, executor.submit(run_app, **kwargs))
            )

        while tasks:
            for i, (name, task) in enumerate(tasks):
                if task.done():
                    try:
                        task.result()
                        logger.info(
                            f'Generator "{name}" has ended successfully'
                        )
                    except Exception as e:
                        logger.error(
                            f'Generator "{name}" has ended with error: {e}'
                        )

                    tasks[i] = None

            tasks = [task for task in tasks if task is not None]
