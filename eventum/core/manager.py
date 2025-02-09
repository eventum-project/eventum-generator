import time
from typing import Iterable

import structlog

from eventum.core.generator import Generator
from eventum.core.models.parameters.generator import GeneratorParameters

logger = structlog.stdlib.get_logger()


class ManagingError(Exception):
    """Error in managing generators."""


class GeneratorManager:
    """Manager of generators."""

    def __init__(self) -> None:
        self._generators: dict[str, Generator] = dict()

    def add(self, params: GeneratorParameters) -> None:
        """Add new generator with provided parameters to list of managed
        generators.

        Parameters
        ----------
        params : GeneratorParameters
            Parameters for generator

        Raises
        ------
        ManagingError
            If generator with this id is already added
        """
        if params.id in self._generators:
            raise ManagingError('Generator with this id is already added')

        self._generators[params.id] = Generator(params)

    def remove(self, generator_id: str) -> None:
        """Remove generator from list of managed generators. Stop it in
        case it is running.

        Parameters
        ----------
        generator_id : str
            ID of generator to remove

        Raises
        ------
        ManagingError
            If generator is not found in list of managed generators
        """
        generator = self.get_generator(generator_id)

        if generator.is_running:
            generator.stop()

        del self._generators[generator_id]

    def bulk_remove(self, generator_ids: Iterable[str]) -> None:
        """Remove generators from list of managed generators. Stop
        generators that are running. If no generator of specified id
        found in list of managed generators it is just skipped.

        Parameters
        ----------
        generator_ids : Iterable[str]
            ID of generators to remove
        """
        for id in generator_ids:
            if id in self._generators:
                generator = self._generators[id]

                if generator.is_running:
                    generator.stop()

                del self._generators[id]

    def start(self, generator_id: str) -> None:
        """Start generator. Ignore call if generator is already
        running.

        Parameters
        ----------
        generator_id : str
            ID of generator to run

        Raises
        ------
        ManagingError
            If generator is not found in list of managed generators
        """
        generator = self.get_generator(generator_id)

        if generator.is_running:
            return

        generator.start()

    def bulk_start(self, generator_ids: Iterable[str]) -> None:
        """Start generators. Ignore call for those that are already
        running. If no generator of specified id found in list of
        managed generators it is just skipped.

        Parameters
        ----------
        generator_ids : Iterable[str]
            ID of generators to start
        """
        for id in generator_ids:
            if id in self._generators:
                generator = self._generators[id]

                if not generator.is_running:
                    generator.start()

    def stop(self, generator_id: str) -> None:
        """Stop generator. Ignore call if generator is not running.

        Parameters
        ----------
        generator_id : str
            ID of generator to stop

        Raises
        ------
        ManagingError
            If generator is not found in list of managed generators
        """
        generator = self.get_generator(generator_id)

        if not generator.is_running:
            return

        generator.stop()

    def bulk_stop(self, generator_ids: Iterable[str]) -> None:
        """Stop generators. Ignore call for those that are not running.
        If no generator of specified id found in list of managed
        generators it is just skipped.

        Parameters
        ----------
        generator_ids : Iterable[str]
            ID of generators to stop
        """
        for id in generator_ids:
            if id in self._generators:
                generator = self._generators[id]

                if generator.is_running:
                    generator.stop()

    def bulk_join(
        self,
        generator_ids: Iterable[str],
        timeout: float | None = None,
        force: bool = True
    ) -> bool:
        """Wait until all running generator terminates.

        Parameters
        ----------
        generator_ids : Iterable[str]
            ID of generators to join

        timeout : float | None, default=None
            Timeout of generator joining

        force : bool, default=True
            Whether to force stop the generator if it was not joined
            within timeout

        Returns
        -------
        bool
            `True` if all generators were joined in time, and `False`
            if timeout is expired
        """
        start_time = time.monotonic()

        joined_on_time = True

        for id in generator_ids:
            if id in self._generators:
                generator = self._generators[id]

                if generator.is_running:
                    if timeout:
                        spent = time.monotonic() - start_time
                        available_time = max(timeout - spent, 0)
                        joined = generator.join(available_time)
                    else:
                        joined = generator.join()

                    if not joined:
                        if force:
                            generator.force_stop()
                            logger.warning(
                                (
                                    'Generator was not joined in time and '
                                    'therefore was force stopped'
                                ),
                                generator_id=id
                            )

                        joined_on_time = False

        return joined_on_time

    def get_generator(self, generator_id: str) -> Generator:
        """Get generator from list of managed generators.

        Parameters
        ----------
        generator_id : str
            ID of generator to get

        Returns
        -------
        Generator
            Generator with provided ID

        Raises
        ------
        ManagingError
            If no generator with provided ID found in managed
            generators
        """
        try:
            return self._generators[generator_id]
        except KeyError:
            raise ManagingError('No such generator')

    @property
    def generator_ids(self) -> list[str]:
        """List of generator ids."""
        return list(self._generators.keys())
