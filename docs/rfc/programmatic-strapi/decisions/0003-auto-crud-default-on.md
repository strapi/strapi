# ADR-0003: Auto-generated REST CRUD, default-on

**Status:** Accepted

## Context

In legacy Strapi, a content type with a core router/controller/service gets REST CRUD at
`/api/<pluralName>`. A programmatic content type should be immediately useful, not just a
schema.

## Decision

For each programmatic content type with `api !== false`, auto-generate a core **router +
controller + service** using the existing `factories.createCoreRouter/Controller/Service`,
producing CRUD at `/api/<pluralName>` — matching legacy behavior. `api: false` opts out
(custom routes only).

## Consequences

- Parity with legacy expectations; the screenshot example "just works".
- Reuses battle-tested factories — no new CRUD code paths.
- Opt-out preserves the minimal, programmatic feel for users who want only custom routes.

## Alternatives considered

- **Default-off (explicit opt-in to CRUD).** Rejected: surprises users migrating from
  legacy and makes the simplest example do nothing.
