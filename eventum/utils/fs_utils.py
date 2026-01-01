"""File system related utils."""

from pathlib import Path


def calculate_dir_size(path: Path) -> int:
    """Calculate size of the directory in bytes.

    Parameters
    ----------
    path : Path
        Path to directory.

    Returns
    -------
    int
        Size in bytes.

    Raises
    ------
    OSError
        If some of the resources cannot be accessed.

    """
    return sum(f.stat().st_size for f in path.glob('**/*') if f.is_file())


def get_dir_last_modification_time(path: Path) -> float:
    """Get last modification time of all files inside the directory.

    Parameters
    ----------
    path : Path
        Path to directory.

    Returns
    -------
    float
        Unix timestamp.

    Raises
    ------
    OSError
        If some of the resources cannot be accessed.

    """
    latest = path.stat().st_mtime

    for item in path.rglob('*'):
        if item.is_file():
            mtime = item.stat().st_mtime
            latest = max(latest, mtime)

    return latest
