import asyncio
from datetime import datetime
from typing import Sequence

import structlog
from janus import Queue
from pytz import timezone

from eventum.core.models.parameters.generator import GeneratorParameters
from eventum.plugins.event.base.plugin import EventPlugin, ProduceParams
from eventum.plugins.exceptions import PluginRuntimeError
from eventum.plugins.input.adapters import (
    AsyncIdentifiedTimestampsSyncAdapter, IdentifiedTimestampsPluginAdapter)
from eventum.plugins.input.base.plugin import InputPlugin
from eventum.plugins.input.batcher import TimestampsBatcher
from eventum.plugins.input.merger import InputPluginsMerger
from eventum.plugins.input.protocols import (
    IdentifiedTimestamps, SupportsAsyncIdentifiedTimestampsIterate,
    SupportsIdentifiedTimestampsSizedIterate)
from eventum.plugins.input.scheduler import AsyncBatchScheduler
from eventum.plugins.output.base.plugin import OutputPlugin
from eventum.utils.exceptions import ContextualException

logger = structlog.stdlib.get_logger()


class ImproperlyConfiguredError(ContextualException):
    """Plugins cannot be executed with provided parameters."""


class ExecutionError(ContextualException):
    """Execution error."""


class Executor:
    """Executor of plugins.

    Parameters
    ----------
    input : Sequence[InputPlugin]
        List of input plugins

    event: EventPlugin
        Event plugin

    output: Sequence[OutputPlugin]
        List of output plugins

    params: GeneratorParameters
        Generator parameters

    Raises
    ------
    ImproperlyConfiguredError
        If initialization fails with provided plugins and parameters

    Notes
    -----
    It is expected that all of the parameters are already validated
    """

    def __init__(
        self,
        input: Sequence[InputPlugin],
        event: EventPlugin,
        output: Sequence[OutputPlugin],
        params: GeneratorParameters
    ) -> None:
        self._input = list(input)
        self._event = event
        self._output = list(output)
        self._params = params
        self._timezone = timezone(self._params.timezone)

        self._input_queue: Queue[IdentifiedTimestamps | None] = Queue(
            maxsize=params.queue.max_batches
        )
        self._event_queue: Queue[list[str] | None] = Queue(
            maxsize=params.queue.max_batches
        )

        self._input_tags = self._build_input_tags_map()
        self._configured_input = self._configure_input()

        self._output_tasks: set[asyncio.Task] = set()
        self._output_semaphore = asyncio.Semaphore(
            value=self._params.max_concurrency
        )

        self._stop_event = asyncio.Event()

    def _build_input_tags_map(self) -> dict[int, tuple[str, ...]]:
        """Build map of input plugin tags.

        Returns
        -------
        dict[int, tuple[str, ...]]
            Tags map with input plugin id in keys and tags tuple in values
        """
        tags_map: dict[int, tuple[str, ...]] = dict()
        for plugin in self._input:
            tags_map[plugin.id] = plugin.config.tags

        return tags_map

    def _configure_input(self) -> SupportsAsyncIdentifiedTimestampsIterate:
        """Configure input plugins according to generator parameters
        by wrapping it to merger, batcher and scheduler.

        Returns
        -------
        SupportsAsyncIdentifiedTimestampsIterate
            Configured input

        Raises
        ------
        ImproperlyConfiguredError
            If input plugins cannot be configured
        """
        if len(self._input) > 1:
            try:
                input: SupportsIdentifiedTimestampsSizedIterate \
                    = InputPluginsMerger(plugins=self._input)
            except ValueError as e:
                raise ImproperlyConfiguredError(
                    'Failed to merge input plugins',
                    context=dict(reason=str(e))
                )
        else:
            input = IdentifiedTimestampsPluginAdapter(
                plugin=self._input[0]
            )

        try:
            batcher = TimestampsBatcher(
                source=input,
                batch_size=self._params.batch.size,
                batch_delay=self._params.batch.delay
            )
        except ValueError as e:
            raise ImproperlyConfiguredError(
                'Failed to initialize batcher',
                context=dict(reason=str(e))
            )

        if self._params.time_mode == 'live':
            return AsyncBatchScheduler(
                batcher=batcher,
                timezone=self._timezone
            )
        else:
            return AsyncIdentifiedTimestampsSyncAdapter(target=batcher)

    async def _open_output_plugins(self) -> None:
        """Open output plugins.

        Raises
        ------
        ExecutionError
            If opening for at least one output plugin fails
        """
        try:
            async with asyncio.TaskGroup() as group:
                for plugin in self._output:
                    group.create_task(plugin.open())
        except* PluginRuntimeError as e:
            await asyncio.gather(
                *[
                    logger.aerror(str(exc), **exc.context)   # type: ignore
                    for exc in e.exceptions
                ]
            )
            raise ExecutionError(
                'Failed to open some of the output plugins',
                context=dict()
            )
        except* Exception as e:
            await asyncio.gather(
                *[logger.aexception(str(exc)) for exc in e.exceptions]
            )
            raise ExecutionError(
                'Unexpected error occurred during opening output plugins',
                context=dict()
            )

    async def _close_output_plugins(self) -> None:
        """Close output plugins.

        Raises
        ------
        ExecutionError
            If closing for at least one output plugin fails
        """
        try:
            async with asyncio.TaskGroup() as group:
                for plugin in self._output:
                    group.create_task(plugin.close())
        except* PluginRuntimeError as e:
            await asyncio.gather(
                *[
                    logger.aerror(str(exc), **exc.context)   # type: ignore
                    for exc in e.exceptions
                ]
            )
            raise ExecutionError(
                'Failed to close some of the output plugins',
                context=dict()
            )
        except* Exception as e:
            await asyncio.gather(
                *[logger.aexception(str(exc)) for exc in e.exceptions]
            )
            raise ExecutionError(
                'Unexpected error occurred during closing output plugins',
                context=dict()
            )

    async def _execute(self) -> None:
        """Start execution of plugins in different threads.

        Raises
        ------
        ExecutionError
            If any error occurs during execution
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

                break

            await asyncio.sleep(0.1)

        await input_task
        await event_task
        await output_task

        await self._input_queue.aclose()
        await self._event_queue.aclose()
        await self._close_output_plugins()

    def execute(self) -> None:
        """Start execution of plugins.

        Raises
        ------
        ExecutionError
            If any error occurs during execution
        """
        with asyncio.Runner() as runner:
            runner.run(self._execute())

    async def _execute_input(self) -> None:
        """Execute input plugins."""
        skip_past = self._params.time_mode == 'live' and self._params.skip_past
        downstream_queue = self._input_queue.async_q

        try:
            async for timestamps in self._configured_input.iterate(
                skip_past=skip_past
            ):
                await downstream_queue.put(timestamps)
        except PluginRuntimeError as e:
            logger.error(str(e), **e.context)
        except Exception as e:
            logger.exception(
                'Unexpected error during input plugins execution',
                reason=str(e)
            )

        await downstream_queue.put(None)

    async def _execute_event(self) -> None:
        """Execute event plugin."""
        upstream_queue = self._input_queue.async_q
        downstream_queue = self._event_queue.async_q

        while True:
            timestamps = await upstream_queue.get()

            if timestamps is None:
                break

            dt_timestamps = timestamps['timestamp'].astype(dtype=datetime)
            params: ProduceParams = ProduceParams(
                tags=tuple(),
                timestamp=datetime.now()
            )
            events: list[str] = []
            for id, timestamp in zip(timestamps['id'], dt_timestamps):
                params['tags'] = self._input_tags[id]
                params['timestamp'] = self._timezone.localize(timestamp)

                try:
                    events.extend(self._event.produce(params=params))
                except PluginRuntimeError as e:
                    logger.error(str(e), **e.context)
                except Exception as e:
                    logger.exception(
                        'Unexpected error during event plugin execution',
                        reason=str(e)
                    )

            if events:
                await downstream_queue.put(events)

        await downstream_queue.put(None)

    def _handle_write_result(self, task: asyncio.Task[int]) -> None:
        """Handle result of output plugin write task.

        Parameters
        ----------
        future : asyncio.Future
            Done future
        """
        try:
            task.result()
        except PluginRuntimeError as e:
            logger.error(str(e), **e.context)
        except Exception as e:
            logger.exception(
                'Unexpected error occurred during output plugin write',
                reason=str(e)
            )
        finally:
            self._output_semaphore.release()
            self._output_tasks.remove(task)

    async def _execute_output(self) -> None:
        """Execute output plugins."""
        loop = asyncio.get_running_loop()
        upstream_queue = self._event_queue.async_q

        gathering_tasks: list[asyncio.Task] = []
        while True:
            events = await upstream_queue.get()

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
