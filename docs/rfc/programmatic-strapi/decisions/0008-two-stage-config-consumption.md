# ADR-0008: Two-stage definition consumption (config at construction)

**Status:** Accepted

## Context

`registerInternalServices()` runs in the **`Strapi` constructor** and builds the `config`,
`logger`, `server`, and (lazy) `db` providers from `internal_config =
loadConfiguration(opts)`. `db` reads `config.get('database')` on first access. Content
types / routes / plugins / lifecycles are consumed later at the register phase. A single
`defineApp` object therefore cannot be consumed all at once.

## Decision

Consume the definition in **two stages**:

1. **Stage 1 — construction.** `createStrapi` forwards `app.config` into
   `loadConfiguration(opts)`, which merges it into the config used to build the container
   (so `database`, `server`, `logger` are correct before `db` is created).
2. **Stage 2 — register phase.** `loadApplicationContext` runs the programmatic branch:
   content types, routes, controllers/services/policies/middlewares, plugins, and
   lifecycle composition.

Phase 1 config validators focus on what a no-files app needs (`database`, `server`) and
pass the rest through to existing config defaults (no behavior drift).

## Consequences

- `config` is special: it must be present/typed before the register phase.
- `defineConfig` validation throws early (at construction) on malformed `database`/`server`.
- Clean separation; no need to rebuild the container after register.

## Alternatives considered

- **Inject all config at register.** Rejected: the container (incl. `db` factory) is
  already built from constructor-time config; too late to influence it.
