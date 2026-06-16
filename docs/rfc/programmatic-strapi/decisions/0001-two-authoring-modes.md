# ADR-0001: Two mutually-exclusive authoring modes + brand-based detection

**Status:** Accepted

## Context

Strapi is filesystem-driven: `createStrapi({ appDir })` loads `src/api/**`, `config/**`,
`src/index.ts`, etc. We want to _also_ let developers describe an app in code
(`defineApp`) and run it as a library, without two parallel runtimes.

## Decision

A single runtime supports **two mutually-exclusive modes per process**, selected by
whether a programmatic `app` (a `defineApp` result) is present:

- **Legacy mode** — no `app`: disk loaders run exactly as today.
- **Programmatic mode** — `app` present: the definition is the source of truth; each
  app-content resource is resolved independently from code or `fromDisk` (ADR-0010).

Detection uses an explicit **Symbol brand** (`isAppDefinition`), supplied two ways:

1. `createStrapi({ app })` / `startStrapi(app)` — direct.
2. `src/index.ts` default export — `loadSrcIndex` brand-checks **before** its existing
   yup `.noUnknown()` validation (a `defineApp` result has extra keys and would
   otherwise be rejected), and routes branded exports to the programmatic path.

`loadApplicationContext` branches at the top: programmatic vs the untouched legacy code.

## Consequences

- The legacy branch is never modified → underpins ADR-0002.
- A clear, debuggable boundary; no implicit merging of modes.
- Brand is a `Symbol.for(...)` so it survives bundling and dual-package boundaries.

## Alternatives considered

- **Merge files + in-memory always.** Rejected: implicit disk reads contradict the
  "explicit, no magic" goal and complicate the zero-breaking-change guarantee.
- **Duck-typing the definition.** Rejected: fragile against the legacy
  `{register,bootstrap,destroy}` shape; a brand is unambiguous.
