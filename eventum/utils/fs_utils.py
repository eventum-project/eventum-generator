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

    """
    return sum(f.stat().st_size for f in path.glob('**/*') if f.is_file())
