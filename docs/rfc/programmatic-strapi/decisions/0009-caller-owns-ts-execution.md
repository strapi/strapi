# ADR-0009: Caller owns TypeScript execution; Phase 1 CLI = `start`

**Status:** Accepted

## Context

The canonical example is authored in TypeScript. `compileStrapi` (TS compile) is a
CLI concern wired into `strapi build`/`develop`. `strapi develop` is admin/bundler-coupled
(cluster + vite/webpack admin watch); `strapi start` simply does
`createStrapi(...).start()`.

## Decision

- In **programmatic mode the caller is responsible for executing TypeScript** (tsx /
  ts-node / precompiled output). We do **not** ship or invoke a TS runtime for
  `startStrapi`.
- **Phase 1 CLI entry is `strapi start`** (with `loadSrcIndex` brand detection), plus the
  primary `startStrapi(app)` programmatic entry. **`strapi develop` parity is deferred**
  because it is coupled to the admin bundler/watch pipeline.
- Keep the granular lifecycle (`register`/`bootstrap`/`start`) available alongside
  `startStrapi`.

## Consequences

- No new TS toolchain to own; users use standard Node/TS tooling.
- Hot-reload/admin-watch DX for programmatic apps is explicitly Phase 2/3.

## Alternatives considered

- **Bundle a TS loader into `startStrapi`.** Rejected: scope creep, fragile, duplicates
  the ecosystem's TS runners.
- **Support `develop` in Phase 1.** Rejected: its admin coupling is out of scope for a
  headless MVP.
