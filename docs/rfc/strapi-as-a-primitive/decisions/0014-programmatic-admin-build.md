# ADR-0014: Programmatic admin build (`buildAdmin`) feeds the existing pipeline with object input

**Status:** Accepted (Phase 2)

## Context

The admin build pipeline (`createBuildContext` → `writeStaticClientFiles` → vite/webpack)
was written for **scaffolded, file-based apps**: it creates a Strapi instance by scanning
`appDir`, and derives the admin's frontend plugin set from `strapi.config.info.dependencies`
(the app's `package.json` deps) plus `config/plugins.js`. A programmatic ("Strapi as a
primitive") app has neither a scannable project layout nor a `package.json` plugin list —
the `defineApp(...)` definition is the single source of truth (ADR-0001, ADR-0006).

## Decision

Add an async **`buildAdmin({ app, dir })`** façade that feeds the _existing_ node build
pipeline with **direct object input** instead of reworking the bundler:

1. `createBuildContext` gains an optional `app` argument. When present, the Strapi
   instance is created from the definition (no file scan) and the **frontend plugin set
   is derived from the in-memory `app.plugins` map**, not a `package.json` scan.
2. Each programmatic plugin entry may carry an optional **`resolve` hint** (the npm
   package base, e.g. `@strapi/content-manager`). `recommendedPlugins()` sets
   `resolve: '@strapi/<name>'`. `getProgrammaticPlugins` maps each enabled plugin to the
   package whose `<base>/strapi-admin` export resolves — trying the `resolve` hint, then
   the `@strapi/<name>` and `<name>` conventions — and **skips** plugins with no
   `strapi-admin` export (e.g. server-only `email`), mirroring how
   `getMapOfPluginsWithAdmin` filters file-based plugins.
3. `buildAdmin` skips the `strapi build` TS-compile and admin-dependency-install steps;
   in programmatic mode those are the caller's responsibility (consistent with ADR-0009 /
   ADR-0017).
4. `buildAdmin` is exposed from `@strapi/strapi` via a **lazy dynamic import**, so the
   heavy build pipeline is not pulled into every runtime `import '@strapi/strapi'`.

A `plugins: fromDisk()` source returns `null` from `getProgrammaticPlugins`, falling back
to the legacy `getEnabledPlugins` discovery — the single bridge to legacy behavior
(ADR-0006).

## Consequences

- The bundler, static-file generation, and serving path are **unchanged**; only the
  _inputs_ differ. The legacy (file-based) `strapi build` path is byte-identical (ADR-0002).
- Programmatic apps get a real admin panel with no files, proven end-to-end by the
  `examples/programmatic-server` Playwright smoke test (panel renders in a browser).
- Plugins that ship a frontend must be resolvable as `<base>/strapi-admin`. First-party
  plugins work out of the box via the `@strapi/<name>` convention; third-party plugins
  should pass an explicit `resolve` hint.

## Alternatives considered

- **Scan a synthesized `package.json`.** Rejected: reintroduces the implicit scan
  ADR-0006 deliberately removed, and a no-files app has no deps to scan.
- **A separate programmatic bundler.** Rejected: duplicates a large, evolving pipeline;
  feeding object input keeps a single implementation.
