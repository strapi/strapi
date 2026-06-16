# Architecture Decision Records

Each ADR captures one architecturally significant decision for **Strapi as a Primitive**:
its context, the decision, consequences, and alternatives considered. ADRs are immutable
once accepted; supersede rather than edit.

Status legend: **Accepted** (agreed in design discussion), **Proposed**, **Superseded**.

## Index

| ADR                                                  | Title                                                                    | Status   |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| [0001](./0001-two-authoring-modes.md)                | Two mutually-exclusive authoring modes + brand-based detection           | Accepted |
| [0002](./0002-zero-breaking-changes.md)              | Zero breaking changes; legacy path untouched                             | Accepted |
| [0003](./0003-auto-crud-default-on.md)               | Auto-generated REST CRUD, default-on (`api: false` to opt out)           | Accepted |
| [0004](./0004-strict-explicit-content-types.md)      | Strict, explicit content types (no legacy magic)                         | Accepted |
| [0005](./0005-internals-in-core-facade-in-strapi.md) | Internals in `@strapi/core`, public surface via `@strapi/strapi`         | Accepted |
| [0006](./0006-plugins-imported-not-scanned.md)       | Plugins imported-and-added; no `package.json` scan                       | Accepted |
| [0007](./0007-admin-always-loads.md)                 | Admin server module always loads; "headless" = no panel                  | Accepted |
| [0008](./0008-two-stage-config-consumption.md)       | Two-stage definition consumption (config at construction)                | Accepted |
| [0009](./0009-caller-owns-ts-execution.md)           | Caller owns TypeScript execution in programmatic mode                    | Accepted |
| [0010](./0010-per-resource-sources-and-fallback.md)  | Per-resource `fromDisk` sources + top-level `from` fallback & precedence | Accepted |
| [0011](./0011-apiname-defaults-to-singular.md)       | `apiName` defaults to `singularName`                                     | Accepted |
| [0012](./0012-route-verb-del.md)                     | Route DSL verbs `get/post/put/patch/del`                                 | Accepted |
| [0013](./0013-guard-missing-package-json.md)         | Guard missing `package.json` for no-files apps                           | Accepted |

## Mapping to RFC "Resolved decisions"

The RFC table (decisions 1–21) maps onto the ADRs as follows:

| RFC # | Topic                                                  | ADR                                       |
| ----- | ------------------------------------------------------ | ----------------------------------------- |
| 1     | Phasing (headless → admin → ecosystem)                 | project plan (`../tasks.md`)              |
| 2     | Exclusive modes; nothing implicit                      | 0001, 0010                                |
| 3     | No legacy magic; explicit names                        | 0004                                      |
| 4     | Auto-CRUD default-on                                   | 0003                                      |
| 5     | Typed surface; keep legacy runtime defaults            | 0004, 0002                                |
| 6     | Config from files or passed in (typed, validated)      | 0008                                      |
| 7     | Internals in core, exposed via strapi                  | 0005                                      |
| 8     | `defineApp` + `startStrapi` + granular lifecycle       | 0001, 0009                                |
| 9     | Single `fromDisk(path)` helper                         | 0010                                      |
| 10    | Top-level `from` fallback (Phase 1)                    | 0010                                      |
| 11    | Guard `package.json`, synthesize minimal info          | 0013                                      |
| 12    | Plugins imported & added; no scan; preset imports-only | 0006                                      |
| 13    | Two-stage consumption (config in constructor)          | 0008                                      |
| 14    | "Headless" = no panel; admin module loads              | 0007                                      |
| 15    | `loadSrcIndex` brand-check before yup                  | 0001                                      |
| 16    | Phase 1 CLI = `start`; defer `develop`                 | 0009                                      |
| 17    | No bundled TS runtime                                  | 0009                                      |
| 18    | Components via `fromDisk` only in Phase 1              | 0004 (+ tasks: Phase 3 `defineComponent`) |
| 19    | Route verbs / `del`; return → `ctx.body`               | 0012                                      |
| 20    | `apiName` defaults to `singularName`                   | 0011                                      |
| 21    | `from` precedence / collisions                         | 0010                                      |
