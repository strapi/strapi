# ADR-0005: Internals in `@strapi/core`, public surface via `@strapi/strapi`

**Status:** Accepted

## Context

`createStrapi`, the registries, loaders, and the `Strapi` class all live in
`@strapi/core`. Users import from `@strapi/strapi`. We must decide where the new
`app-definition` logic lives and how it is exposed.

## Decision

- **Implement all runtime logic in `@strapi/core`** (`src/app-definition/` + the loader
  refactor), next to the registries and lifecycle it integrates with.
- **Expose the public surface from `@strapi/strapi`** as a thin façade: re-export
  `defineApp`, `defineConfig`, `fromDisk`, `isAppDefinition`, `startStrapi`, types; add
  subpath exports `./attributes` (the `is.*` builders) and `./plugins`
  (`recommendedPlugins()`).

`defineApp` / `defineConfig` / `is.*` are pure functions returning plain objects, so
their weight is negligible; the runtime cost only appears at `createStrapi().start()`.

## Consequences

- Single home for logic; façade stays declarative and stable.
- `@strapi/core` remains usable directly by advanced consumers.
- New `package.json` `exports` entries in `@strapi/strapi`.

## Alternatives considered

- **Implement in `@strapi/strapi`.** Rejected: splits logic away from the registries it
  drives and from `createStrapi`.
