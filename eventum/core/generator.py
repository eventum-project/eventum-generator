from multiprocessing import Manager, Process

from eventum.core.entrypoint import start
from eventum.core.models.metrics import Metrics
from eventum.core.models.parameters.generator import GeneratorParameters


class Generator:
    """Generator process wrapper."""

    def __init__(self, params: GeneratorParameters) -> None:
        self._params = params
        self._manager = Manager()
        self._metrics = self._manager.dict()
        self._process = Process(target=start, args=(params, self._metrics))

    def start(self) -> None:
        """Start generator in subprocess."""
        if self.is_running:
            return

        self._process.start()

    def stop(self) -> None:
        """Stop generator."""
        if not self.is_running:
            return

        self._process.terminate()

    def force_stop(self) -> None:
        """Stop generator using kill signal."""
        if not self.is_running:
            return

        self._process.kill()

    def join(self, timeout: float | None = None) -> None:
        """Wait until generator terminates.

        Parameters
        ----------
        timeout : float | None, default=None
            Timeout of generator joining
        """
        if not self.is_running:
            return None

        self._process.join(timeout)

    def get_metrics(self) -> Metrics | None:
        """Get generator metrics if available.

        Returns
        -------
        Metrics | None
            Generator metrics
        """
        if self._metrics:
            return Metrics(**self._metrics)     # type: ignore[typeddict-item]

        return None

    @property
    def is_running(self) -> bool:
        """Wether the generator is running."""
        return self._process.is_alive()

    @property
    def exit_code(self) -> int | None:
        """Exit code of generator process."""
        return self._process.exitcode
