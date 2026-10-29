# ADR-0010: Per-resource `fromDisk` sources + top-level `from` fallback & precedence

**Status:** Accepted

## Context

Migration must be incremental: a programmatic app should be able to reuse existing
on-disk resources field-by-field (e.g. keep `config/` and `controllers/` on disk while
defining content types and routes in code), not just an all-or-nothing root toggle.

## Decision

- Each app-content resource field accepts either an **in-code value** or a branded
  **`fromDisk(path)`** source. A single unified helper `fromDisk(path)` is used; each
  field knows whether the path is a file, directory, or project root.
- `fromDisk` is resolved by the loader to the matching **path-parametric core**
  (`loadXFromDir`) — the same core the legacy wrapper uses.
- **Top-level `from: fromDisk('./app')`** fills _all unspecified_ resources from one
  project root (whole-app migration), included in Phase 1.
- **Precedence:** a per-field source/value **replaces** that whole resource from `from`.
- **Collision rule:** within a single resource, a disk source and an in-code definition
  for the **same UID/name** is an error — throw a clear startup error rather than
  silently merging.

## Consequences

- Smooth, granular migration story; mix code and disk freely.
- Deterministic resolution; collisions fail loudly.
- The loader refactor into path-parametric cores (ADR-0002 wrappers) is a prerequisite.

## Alternatives considered

- **Root on/off only.** Rejected: too coarse; the user explicitly wanted per-field.
- **Silent merge on collision.** Rejected: ambiguous precedence, hard to debug.
