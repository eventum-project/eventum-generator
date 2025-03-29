"""Executor of plugins that orchestrates data flow between them."""

import asyncio
from collections.abc import Sequence
from datetime import datetime
from typing import cast

import structlog
import uvloop
from pytz import timezone

from eventum.core.parameters import GeneratorParameters
from eventum.exceptions import ContextualError
from eventum.plugins.event.base.plugin import EventPlugin, ProduceParams
from eventum.plugins.event.exceptions import (
    PluginExhaustedError,
    PluginProduceError,
)
from eventum.plugins.input.adapters import (
    AsyncIdentifiedTimestampsSyncAdapter,
    IdentifiedTimestampsPluginAdapter,
)
from eventum.plugins.input.base.plugin import InputPlugin
from eventum.plugins.input.batcher import TimestampsBatcher
from eventum.plugins.input.exceptions import PluginGenerationError
from eventum.plugins.input.merger import InputPluginsMerger
from eventum.plugins.input.protocols import (
    IdentifiedTimestamps,
    SupportsAsyncIdentifiedTimestampsIterate,
    SupportsIdentifiedTimestampsSizedIterate,
)
from eventum.plugins.input.scheduler import AsyncBatchScheduler
from eventum.plugins.output.base.plugin import OutputPlugin
from eventum.plugins.output.exceptions import PluginOpenError, PluginWriteError

logger = structlog.stdlib.get_logger()


class ImproperlyConfiguredError(ContextualError):
    """Plugins cannot be executed with provided parameters."""


class ExecutionError(ContextualError):
    """Execution error."""


class Executor:
    """Executor of plugins."""

    def __init__(
        self,
        input: Sequence[InputPlugin],
        event: EventPlugin,
        output: Sequence[OutputPlugin],
        params: GeneratorParameters,
    ) -> None:
        """Initialize executor.

        Parameters
        ----------
        input : Sequence[InputPlugin]
            List of input plugins.

        event: EventPlugin
            Event plugin.

        output: Sequence[OutputPlugin]
            List of output plugins.

        params: GeneratorParameters
            Generator parameters.

        Raises
        ------
        ValueError
            If some of the top level parameters are invalid.

        ImproperlyConfiguredError
            If initialization fails with provided plugins and parameters.

        """
        self._input = list(input)
        self._event = event
        self._output = list(output)
        self._params = params
        self._timezone = timezone(self._params.timezone)

        if not self._input:
            msg = 'At least one input plugin must be provided'
            raise ValueError(msg)

        if not self._output:
            msg = 'At least one output plugin must be provided'
            raise ValueError(msg)

        self._input_queue: asyncio.Queue[IdentifiedTimestamps | None] = (
            asyncio.Queue(maxsize=params.queue.max_batches)
        )
        self._event_queue: asyncio.Queue[list[str] | None] = asyncio.Queue(
            maxsize=params.queue.max_batches,
        )

        self._input_tags = self._build_input_tags_map()
        self._configured_input = self._configure_input()

        self._output_tasks: set[asyncio.Task] = set()
        self._output_semaphore = asyncio.Semaphore(
            value=self._params.max_concurrency,
        )

        self._stop_event = asyncio.Event()

    def _build_input_tags_map(self) -> dict[int, tuple[str, ...]]:
        """Build map of input plugin tags.

        Returns
        -------
        dict[int, tuple[str, ...]]
            Tags map with input plugin id in keys and tags tuple in
            values.

        """
        tags_map: dict[int, tuple[str, ...]] = {}
        for plugin in self._input:
            tags_map[plugin.id] = plugin.config.tags

        return tags_map

    def _configure_input(self) -> SupportsAsyncIdentifiedTimestampsIterate:
        """Configure input plugins according to generator parameters
        by wrapping it to merger, batcher and scheduler.

        Returns
        -------
        SupportsAsyncIdentifiedTimestampsIterate
            Configured input.

        Raises
        ------
        ImproperlyConfiguredError
            If input plugins cannot be configured.

        """
        if len(self._input) > 1:
            try:
                input: SupportsIdentifiedTimestampsSizedIterate = (
                    InputPluginsMerger(plugins=self._input)
                )
            except ValueError as e:
                msg = 'Failed to merge input plugins'
                raise ImproperlyConfiguredError(
                    msg,
                    context={'reason': str(e)},
                ) from None
        else:
            input = IdentifiedTimestampsPluginAdapter(
                plugin=self._input[0],
            )

        try:
            batcher = TimestampsBatcher(
                source=input,
                batch_size=self._params.batch.size,
                batch_delay=self._params.batch.delay,
            )
        except ValueError as e:
            msg = 'Failed to initialize batcher'
            raise ImproperlyConfiguredError(
                msg,
                context={'reason': str(e)},
            ) from None

        if self._params.time_mode == 'live':
            return AsyncBatchScheduler(
                source=batcher,
                timezone=self._timezone,
            )
        return AsyncIdentifiedTimestampsSyncAdapter(target=batcher)

    async def _open_output_plugins(self) -> None:
        """Open output plugins.

        Raises
        ------
        ExecutionError
            If opening for at least one output plugin fails.

        """
        try:
            async with asyncio.TaskGroup() as group:
                for plugin in self._output:
                    group.create_task(plugin.open())
        except* PluginOpenError as e:
            exceptions = cast('tuple[PluginOpenError]', e.exceptions)
            await asyncio.gather(
                *[
                    logger.aerror(str(exc), **exc.context)
                    for exc in exceptions
                ],
            )
            msg = 'Failed to open some of the output plugins'
            raise ExecutionError(msg, context={}) from None
        except* Exception as e:
            await asyncio.gather(
                *[logger.aexception(str(exc)) for exc in e.exceptions],
            )
            msg = 'Unexpected error occurred during opening output plugins'
            raise ExecutionError(msg, context={}) from e

    async def _close_output_plugins(self) -> None:
        """Close output plugins."""
        await asyncio.gather(
            *[plugin.close() for plugin in self._output],
            return_exceptions=True,
        )

    async def _execute(self) -> None:
        """Start execution of plugins in different threads.

        Raises
        ------
        ExecutionError
            If any error occurs during execution.

        """
        loop = asyncio.get_running_loop()

        await self._open_output_plugins()

        input_task = loop.create_task(self._execute_input())
        event_task = loop.create_task(self._execute_event())
        output_task = loop.create_task(self._execute_output())

        while True:
            if input_task.done() and event_task.done() and output_task.done():
                break

            if self._stop_event.is_set():
                input_task.cancel()
                event_task.cancel()
                output_task.cancel()

                self._stop_event.clear()

                break

            await asyncio.sleep(0.1)

        await self._close_output_plugins()

    def execute(self) -> None:
        """Start execution of plugins.

        Raises
        ------
        ExecutionError
            If any error occurs during execution.

        Notes
        -----
        This method is intended to be called once per executor instance.

        """
        with asyncio.Runner(loop_factory=uvloop.new_event_loop) as runner:
            runner.run(self._execute())

    async def _execute_input(self) -> None:
        """Execute input plugins."""
        skip_past = self._params.time_mode == 'live' and self._params.skip_past

        try:
            async for timestamps in self._configured_input.iterate(
                skip_past=skip_past,
            ):
                await self._input_queue.put(timestamps)
        except asyncio.QueueShutDown:
            logger.info(
                'Stopping input plugins execution due to downstream queue '
                'is closed',
            )
        except PluginGenerationError as e:
            logger.error(str(e), **e.context)
        except Exception as e:
            logger.exception(
                'Unexpected error during input plugins execution',
                reason=str(e),
            )

        logger.info('Finishing input plugins execution')
        await self._input_queue.put(None)

    async def _execute_event(self) -> None:
        """Execute event plugin."""
        exhausted = False

        while not exhausted:
            timestamps = await self._input_queue.get()

            if timestamps is None:
                break

            dt_timestamps = timestamps['timestamp'].astype(dtype=datetime)
            params: ProduceParams = ProduceParams(
                tags=...,  # type: ignore[typeddict-item]
                timestamp=...,  # type: ignore[typeddict-item]
            )
            events: list[str] = []
            for id, timestamp in zip(
                timestamps['id'],
                dt_timestamps,
                strict=False,
            ):
                params['tags'] = self._input_tags[id]
                params['timestamp'] = self._timezone.localize(timestamp)

                try:
                    events.extend(self._event.produce(params=params))
                except PluginProduceError as e:
                    logger.error(str(e), **e.context)
                except PluginExhaustedError:
                    logger.info('Events exhausted, closing upstream queue')
                    self._input_queue.shutdown(immediate=True)
                    exhausted = True
                    break
                except Exception as e:
                    logger.exception(
                        'Unexpected error during event plugin execution',
                        reason=str(e),
                    )

            if events:
                await self._event_queue.put(events)

        await self._event_queue.put(None)

    def _handle_write_result(self, task: asyncio.Task[int]) -> None:
        """Handle result of output plugin write task.

        Parameters
        ----------
        task : asyncio.Task[int]
            Done future.

        """
        try:
            task.result()
        except PluginWriteError as e:
            logger.error(str(e), **e.context)
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during output plugin write',
                reason=str(e),
            )
        finally:
            self._output_semaphore.release()
            self._output_tasks.remove(task)

    async def _execute_output(self) -> None:
        """Execute output plugins."""
        loop = asyncio.get_running_loop()

        gathering_tasks: list[asyncio.Task] = []
        while True:
            events = await self._event_queue.get()

            if events is None:
                break

            for plugin in self._output:
                await self._output_semaphore.acquire()

                task = loop.create_task(plugin.write(events))
                self._output_tasks.add(task)
                gathering_tasks.append(task)

                task.add_done_callback(self._handle_write_result)

            if self._params.keep_order:
                await asyncio.gather(*gathering_tasks, return_exceptions=True)

            gathering_tasks.clear()

        if self._output_tasks:
            await asyncio.gather(*self._output_tasks, return_exceptions=True)
            self._output_tasks.clear()

    def request_stop(self) -> None:
        """Request stop of execution. This method is expected to be
        called from thread other than the one executing `execute`
        method.
        """
        self._stop_event.set()
