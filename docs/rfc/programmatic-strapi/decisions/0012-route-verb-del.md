# ADR-0012: Route DSL verbs `get/post/put/patch/del`

**Status:** Accepted

## Context

The route DSL hands verb functions to a builder: `({ get, post, ... }) => Route[]`.
`delete` is a reserved word in JavaScript and cannot be used as a destructured binding
name (`({ delete }) => ...` is a syntax error).

## Decision

The DSL exposes verbs **`get`, `post`, `put`, `patch`, `del`** (using `del` for HTTP
DELETE). Each returns the existing `Core.RouteInput`. Inline function handlers are
supported; a handler's return value becomes `ctx.body` when `ctx.body` is unset (via the
existing `returnBodyMiddleware`).

## Consequences

- Ergonomic destructuring with no syntax pitfalls.
- Matches common Node router conventions (`del`).

## Alternatives considered

- **`delete` via `verbs.delete(...)` (no destructuring).** Rejected: inconsistent with
  the destructured style shown in the example.
- **`remove`.** Rejected: less conventional than `del` for HTTP DELETE.
