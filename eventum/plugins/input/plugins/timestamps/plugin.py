"""Definition of timestamps input plugin."""

from collections.abc import Iterator
from datetime import datetime
from pathlib import Path
from typing import override

from numpy import array, astype, datetime64
from numpy.typing import NDArray

from eventum.plugins.exceptions import PluginConfigurationError
from eventum.plugins.input.base.plugin import InputPlugin, InputPluginParams
from eventum.plugins.input.plugins.timestamps.config import (
    TimestampsInputPluginConfig,
)
from eventum.plugins.input.utils.array_utils import get_future_slice
from eventum.plugins.input.utils.time_utils import now64, to_naive


class TimestampsInputPlugin(
    InputPlugin[TimestampsInputPluginConfig, InputPluginParams],
):
    """Input plugin for generating events at specified timestamps."""

    @override
    def __init__(
        self,
        config: TimestampsInputPluginConfig,
        params: InputPluginParams,
    ) -> None:
        super().__init__(config, params)

        if isinstance(config.source, Path):
            timestamps: list[datetime] = [
                to_naive(ts, self._timezone)
                for ts in self._read_timestamps_from_file(config.source)
            ]
            self._logger.info(
                'Timestamps are read from the file',
                file_path=str(config.source),
                count=len(timestamps),
            )
        else:
            timestamps = [to_naive(ts, self._timezone) for ts in config.source]
            self._logger.info(
                'Timestamps are read from configuration',
                file_path=str(config.source),
                count=len(timestamps),
            )

        if not timestamps:
            msg = 'Timestamps sequence is empty'
            raise PluginConfigurationError(
                msg,
                context={'file_path': config.source},
            )

        self._timestamps: NDArray[datetime64] = array(
            timestamps,
            dtype='datetime64[us]',
        )

    def _read_timestamps_from_file(self, filename: Path) -> list[datetime]:
        """Read timestamps from specified file.

        Parameters
        ----------
        filename : str
            Path to file with timestamps that are delimited with new
            line.

        Returns
        -------
        list[datetime]
            List of datetime objects.

        Raises
        ------
        PluginConfigurationError
            If cannot read content of the specified file or parse
            timestamps.

        """
        try:
            with filename.open() as f:
                return [
                    datetime.fromisoformat(line.strip())
                    for line in f.readlines()
                    if line.strip()
                ]
        except (OSError, ValueError) as e:
            msg = 'Failed to read timestamps from file'
            raise PluginConfigurationError(
                msg,
                context={
                    'file_path': filename,
                    'reason': str(e),
                },
            ) from None

    @override
    def _generate(
        self,
        size: int,
        *,
        skip_past: bool = True,
    ) -> Iterator[NDArray[datetime64]]:
        start = self._timezone.localize(
            astype(self._timestamps[0], datetime),  # type: ignore[arg-type]
        )
        end = self._timezone.localize(
            astype(self._timestamps[-1], datetime),  # type: ignore[arg-type]
        )
        self._logger.info(
            'Generating in range',
            start_timestamp=start.isoformat(),
            end_timestamp=end.isoformat(),
        )

        if skip_past:
            timestamps = get_future_slice(
                timestamps=self._timestamps,
                after=now64(timezone=self._timezone),
            )
        else:
            timestamps = self._timestamps

        self._buffer.mv_push(timestamps)
        yield from self._buffer.read(size, partial=True)
