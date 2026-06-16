# ADR-0002: Zero breaking changes; legacy path untouched

**Status:** Accepted

## Context

Strapi has a large installed base of file-based apps and a published public API. The
primitive must be purely additive — no existing app, type, export, or runtime behavior
may change.

## Decision

Everything in this initiative is additive:

- The **legacy `loadApplicationContext` branch is byte-for-byte unchanged.** Where loaders
  are refactored into path-parametric cores, the legacy wrapper calls the core with the
  exact existing `strapi.dirs.dist.*` path, so behavior is identical (it is the same code,
  parameterized).
- No existing export, type, or default is removed or repurposed. New exports
  (`defineApp`, `defineConfig`, `fromDisk`, `startStrapi`, `./attributes`, `./plugins`)
  are added.
- The stable contract for plugins/user code — **registries + instance accessors** — is
  untouched (loaders are private; see RFC "Loader-level surface").

## Consequences

- Refactors must be proven equivalence-preserving (snapshot/integration tests on the
  legacy path are part of the checklist).
- Some duplication (core + wrapper) is accepted as the cost of safety.

## Alternatives considered

- **Rewrite loaders to a single new model used by both modes.** Rejected for Phase 1:
  higher risk to the legacy path; the wrapper approach isolates risk.
