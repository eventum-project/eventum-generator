"""OTLP collector backend consumer for integration tests."""

import asyncio
import json
from collections.abc import Iterator
from pathlib import Path

from tests.integration.backends.base import BackendConsumer

RecordEntry = tuple[dict, dict]


class CollectorConsumer(BackendConsumer):
    """Consume log records exported by a real OTLP collector.

    Wraps the file the collector's `file` exporter writes to over a
    host bind mount. One collector container, and therefore one
    output file, serves every test in the module, so isolation
    cannot rely on a unique resource per test the way the OpenSearch
    index or Kafka topic consumers do.

    Instead of truncating the shared file between tests, each
    instance records the file's size at `setup` and only considers
    bytes appended after that offset its own. This avoids two
    problems a truncate-based approach would have: the container
    writes the file as a user the host test process cannot always
    write back to (its own container user, not the host user
    running pytest), and truncating a file a writer still holds open
    only round-trips safely if every write lands through the file's
    `O_APPEND` flag, which is an implementation detail of the
    exporter rather than a contract this suite should depend on.
    Reading is safe regardless: the exporter's writes always land
    after the current end of file, so a recorded offset never misses
    a record and never doubles up one from an earlier test, as long
    as that earlier test's own assertions already observed its
    records on disk before returning (`wait_for_count` guarantees
    this for every test using it).

    The file grows for the lifetime of the collector container.
    `teardown` is a no-op for the same reason `setup` does not
    truncate; the container's lifecycle (started and stopped around
    the whole test session) is what bounds its size.

    """

    def __init__(self, output_path: Path) -> None:
        self._path = output_path
        self._offset = 0

    async def setup(self) -> None:
        """Record the current end of the shared output file."""
        self._offset = await asyncio.to_thread(self._current_size)

    async def teardown(self) -> None:
        """No-op: the shared output file is never truncated."""

    def _current_size(self) -> int:
        """Return the current size of the output file in bytes."""
        try:
            return self._path.stat().st_size
        except FileNotFoundError:
            return 0

    def _read_new_lines(self) -> list[dict]:
        """Read and parse every line appended since `setup`.

        A trailing line that is still being written is silently
        skipped: it is incomplete JSON (or ends on a truncated
        multi-byte character) and will be read whole on a later
        poll. Lines are split and decoded individually, one byte
        line at a time, so a truncated trailing line cannot break
        decoding of the complete lines before it.
        """
        try:
            with self._path.open('rb') as file:
                file.seek(self._offset)
                data = file.read()
        except FileNotFoundError:
            return []

        lines: list[dict] = []
        for raw_line in data.splitlines():
            if not raw_line.strip():
                continue
            try:
                lines.append(json.loads(raw_line.decode('utf-8')))
            except UnicodeDecodeError, json.JSONDecodeError:
                continue

        return lines

    def _iter_records(self) -> Iterator[RecordEntry]:
        """Yield `(resource, record)` pairs across every new line."""
        for envelope in self._read_new_lines():
            for resource_logs in envelope.get('resourceLogs', []):
                resource = resource_logs.get('resource', {})
                for scope_logs in resource_logs.get('scopeLogs', []):
                    yield from (
                        (resource, record)
                        for record in scope_logs.get('logRecords', [])
                    )

    async def consume_all(
        self,
        timeout: float = 10.0,  # noqa: ARG002
    ) -> list[str]:
        """Return the `body.stringValue` of every new record.

        Parameters
        ----------
        timeout : float
            Unused, kept for interface consistency with the other
            backend consumers: reading the file is not a blocking
            network call.

        Returns
        -------
        list[str]
            Raw event bodies, in the order the collector wrote them.

        """
        records = await asyncio.to_thread(
            lambda: [record for _, record in self._iter_records()],
        )
        return [
            record.get('body', {}).get('stringValue', '') for record in records
        ]

    async def consume_records(self) -> list[RecordEntry]:
        """Return every new record paired with its resource.

        Returns
        -------
        list[RecordEntry]
            `(resource, record)` pairs in the OTLP/JSON shape the
            collector exported them in, for tests that check
            attributes or resource attributes directly rather than
            just the record body.

        """
        return await asyncio.to_thread(lambda: list(self._iter_records()))

    async def count(self) -> int:
        """Return the number of log records appended since `setup`."""
        records = await asyncio.to_thread(
            lambda: list(self._iter_records()),
        )
        return len(records)
