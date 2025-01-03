import os

import pytest
from pytz import timezone

from eventum.plugins.exceptions import PluginConfigurationError
from eventum.plugins.input.plugins.time_patterns.config import \
    TimePatternsInputPluginConfig
from eventum.plugins.input.plugins.time_patterns.plugin import \
    TimePatternsInputPlugin

STATIC_FILES_DIR = os.path.join(
    os.path.abspath(os.path.dirname(__file__)),
    'static'
)


def test_time_pattern_sample():
    config = TimePatternsInputPluginConfig(
        patterns=[
            os.path.join(STATIC_FILES_DIR, 'pattern1.yml'),
            os.path.join(STATIC_FILES_DIR, 'pattern2.yml'),
            os.path.join(STATIC_FILES_DIR, 'pattern3.yml')
        ]
    )
    plugin = TimePatternsInputPlugin(
        config=config,
        params={
            'id': 1,
            'live_mode': False,
            'timezone': timezone('UTC')
        }
    )

    timestamps = []
    for batch in plugin.generate():
        timestamps.extend(batch)

    assert timestamps

    # Expected distribution:
    # ====================================================================== #
    # @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#%@@@@@@@@@@@@%@@@@@@@@@@@ #
    # @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*-*@@@@@@@@@@@#+#@@@@@@@@@@ #
    # @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%--=%@@@@@@@@@@=-=*%%@@@@@@@ #
    # @@@@@@@@@@%%@@@@@@@@@@@@%@@@@@@@@@@@@#*%@%+---*@@@@@@@@@#----=*@@@@@@@ #
    # @@@@@@@@@%=+@@@@@@@@@@@%+#@@@@@@@@@@%=-=*=----=#@@*+%@@%=-----=@#%@@@@ #
    # @@@@%%@@@+--#@@@@@@@@@@#--+%@%+*%@@@*-----------++--*%#=------=*-*@@@@ #
    # @@@#=*%%+---=%@@%#%@@@%=---=*=--#@@%=----------------=-----------=%@@@ #
    # @@@+--==-----+%%*-*@@@*---------+@@%=-----------------------------*@@@ #
    # @@#-----------==---*#+-----------#@%------------------------------=%@@ #
    # @%=-------------------------------##-------------------------------=#% #
    # ====================================================================== #

    # Uncomment section below to visualize distribution

    # import matplotlib.pyplot as plt
    # plt.hist(timestamps, bins=1000)
    # plt.show()


def test_time_pattern_live():
    config = TimePatternsInputPluginConfig(
        patterns=[
            os.path.join(STATIC_FILES_DIR, 'pattern1.yml'),
            os.path.join(STATIC_FILES_DIR, 'pattern2.yml'),
            os.path.join(STATIC_FILES_DIR, 'pattern3.yml')
        ]
    )
    plugin = TimePatternsInputPlugin(
        config=config,
        params={
            'id': 1,
            'live_mode': True,
            'timezone': timezone('UTC')
        }
    )

    timestamps = []
    for batch in plugin.generate():
        timestamps.extend(batch)

    assert timestamps

    # Uncomment section below to visualize distribution

    # import matplotlib.pyplot as plt
    # plt.hist(timestamps, bins=1000)
    # plt.show()


def test_time_pattern_invalid_config():
    config = TimePatternsInputPluginConfig(
        patterns=[
            os.path.join(STATIC_FILES_DIR, 'invalid.yml'),
        ]
    )

    with pytest.raises(PluginConfigurationError):
        TimePatternsInputPlugin(
            config=config,
            params={
                'id': 1,
                'live_mode': True,
                'timezone': timezone('UTC')
            }
        )
