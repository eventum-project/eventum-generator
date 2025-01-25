from enum import IntEnum
from typing import assert_never


class ExitCode(IntEnum):
    SUCCESS = 0
    CONFIG_ERROR = 1
    INIT_ERROR = 2
    EXECUTION_ERROR = 3

    UNEXPECTED_ERROR = 125


def get_exit_code_description(code: ExitCode) -> str:
    """Get description of exit code.

    Parameters
    ----------
    code : ExitCode
        Exit code to get description for

    Returns
    -------
    str
        Description of exit code
    """
    match code:
        case ExitCode.SUCCESS:
            return 'Exited successfully'
        case ExitCode.CONFIG_ERROR:
            return 'Invalid generator configuration'
        case ExitCode.INIT_ERROR:
            return 'Initialization error'
        case ExitCode.EXECUTION_ERROR:
            return 'Execution error'
        case ExitCode.UNEXPECTED_ERROR:
            return 'Unexpected error'
        case v:
            assert_never(v)
