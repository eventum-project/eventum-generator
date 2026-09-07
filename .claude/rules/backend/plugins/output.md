# Output Plugin Rules

Output plugins deliver event strings to a destination (file, socket, broker, etc.). Output plugins have an explicit async lifecycle: `_open` to acquire the destination, `_write` to push batches, `_close` to release.

## Interface

- Inherit `OutputPlugin[FooConfig, FooParams]`; config inherits `OutputPluginConfig`, params inherits `OutputPluginParams`.
- Implement async `_open`, `_close`, `_write`.
- `_write` receives a batch of events and returns the number actually written (not blindly `len(events)`).

## Config

- Output configs carry a `formatter` field - choose the most appropriate default format when implementing new plugin.

## Lifecycle

- Acquiring runtime resources (open files, sockets, clients) happens in `_open`, not in `__init__`.
- Releasing them happens in `_close`.

## Errors

- Raise `PluginOpenError` for failures in `_open`.
- Raise `PluginWriteError` for failures in `_write`.
- `FormatError` raised by the formatter is logged by the base class with the offending event - don't catch it in `_write`.

## Async context

- `_write` runs on the event loop. Offload CPU-bound work via `asyncio.to_thread` to keep the loop free.

## Cross-cutting updates

Adding a new formatter requires:

- matching Zod schema under `ui/src/api/routes/generator-configs/schemas/`.
- `FormatterParams.tsx` UI component.
- entry in `../docs/content/docs/plugins/formatters.mdx`.

Adding an authentication method to `output/http_auth/` requires:

- config variant in `config.py`, listed in `HttpAuthConfigT`.
- authenticator in `authenticators.py`, bound through `auth_type=`.
- Zod variant in `schemas/plugins/output/auth.ts` and a branch in `AuthParams.tsx`.
- section in `../docs/content/docs/plugins/output/http.mdx`.

A method holding a token it renews builds on `TokenHttpAuthenticator` and supplies `_fetch_token` alone.
