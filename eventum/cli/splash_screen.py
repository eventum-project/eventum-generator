"""Splash screen for printing it on app startup."""

import platform
import sys

import click

import eventum

APP_VERSION = eventum.__version__
PYTHON_VERSION = (
    f'{sys.version_info.major}'
    f'.{sys.version_info.minor}'
    f'.{sys.version_info.micro}'
)

APP_BANNER = click.style(
    text=r"""
        ______         *           __     *
 *     / ____/_ * __ ___   ____ * / /_ __  __ ____*___
      / __/  | | / // _ \ / __ \ / __// / / // __ `__ \
   * / /___  | |/ //  __// / / // /_ / /_/ // / / / / /
    /_____/  |___/ \___//_/ /_/ \__/ \__,_//_/ /_/ /_/
""",
    fg=(130, 130, 239),
)

APP_DESCRIPTION = click.style(
    text="""
===========================================================
          Eventum - Events generation platform
===========================================================
""",
    fg=(130, 130, 239),
    bold=True,
)

APP_VERSION_INFO = f"""\
App version: {click.style(APP_VERSION, fg='cyan')}
Python version: {click.style(PYTHON_VERSION, fg='cyan')}
Platform: {click.style(platform.platform(), fg='green')}
"""

SPLASH_SCREEN = APP_BANNER + APP_DESCRIPTION + APP_VERSION_INFO
