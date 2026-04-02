---
title: Publication filter query modes
description: Extend document query filtering with derived publication modes while preserving status compatibility
tags:
  - content-api
  - document-service
  - content-manager
---

# Publication filter query modes

## Summary

This RFC specifies an optional `publicationFilter` query parameter for the document service, REST API, and GraphQL.
The goal is to expose derived publication queries without changing the existing `status` contract (`draft`, `published`) or existing default behavior.

The change is intentionally non-breaking:

- Existing query behavior for `status=draft|published` remains unchanged.
- Existing response payloads remain unchanged.
- Existing persistence model remains unchanged (all publication states are derived, not stored as a status column).
- Existing defaulting behavior remains unchanged:
  - Core REST API default status is `published`.
  - Direct document service default status is `draft`.
- The older `hasPublishedVersion` boolean query parameter remains accepted for compatibility; it is implemented by mapping to the document-scoped modes `never-published-document` / `has-published-version-document` (see [Deprecated `hasPublishedVersion`](#deprecated-haspublishedversion)).

## Detailed design

### API shape

- Keep `status` unchanged (`draft`, `published`).
- Add optional `publicationFilter` with the following string values (REST and document service use kebab-case; GraphQL exposes the same cohorts as the `PublicationFilter` enum, e.g. `NEVER_PUBLISHED` → `never-published`).

**Pair-scoped** (cohorts are defined per `(documentId, locale)`):

- `never-published`
- `has-published-version`
- `modified`
- `unmodified`

**Document-scoped** (cohorts aggregate across locales for the same `documentId`):

- `never-published-document`
- `has-published-version-document`

**Published-slice diagnostics** (only meaningful with `status=published`; degenerate with `status=draft`):

- `published-without-draft` — published row for a pair with **no** draft sibling
- `published-with-draft` — published row for a pair that **has** a draft sibling

If `publicationFilter` is omitted, behavior is unchanged.

### Semantics

`publicationFilter` selects a derived cohort of `(documentId, locale)` pairs (for localized types). For types without locale, read “pair” as `documentId` only.

The resolved `status` then chooses which **physical row** slice to return (`draft` = `publishedAt` null, `published` = `publishedAt` non-null) from that cohort.
The same `publicationFilter` can therefore be used with either status where meaningful.

- `never-published`: for this `(documentId, locale)`, **no** row exists with a non-null `publishedAt` (only draft-only or absent published version for that pair).
- `has-published-version`: for this `(documentId, locale)`, **both** a draft row and a published row exist (each slice has a row). This excludes “orphan” published-only rows (published row with no draft peer for the same pair), which can arise from legacy data or manual DB edits—not normal D&P invariants.
- `modified`: among pairs that have both slices, the draft row is strictly newer than the published row (`draft.updatedAt > published.updatedAt`).
- `unmodified`: among pairs that have both slices, the draft row is not newer (`draft.updatedAt <= published.updatedAt`).

Document-scoped modes apply the same _ideas_ as `never-published` / `has-published-version`, but existence checks are evaluated at **document** granularity (any locale), not per pair. Use these when the caller cares whether a _document_ has ever been published anywhere, not per-locale publication.

Published-slice diagnostics inspect the **published** row and correlate with the presence or absence of a **draft** row for the same pair (`published-without-draft` / `published-with-draft`). They replace the earlier sketch names `no-draft-version` / `has-draft-version`.

Some combinations are naturally degenerate (for example, the selected status slice is empty for the chosen cohort).
Degenerate combinations should return empty results, not validation errors.

When `status` is omitted, status is first resolved from current defaults, then `publicationFilter` rules are applied.

### Why not just filter on `publishedAt`?

`publishedAt` (and `updatedAt`) on **one** row only describe that row. Several cohorts are inherently **relational** across the two slices for the same logical document pair:

| Cohort                          | Why `publishedAt` alone is insufficient                                                                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `never-published` (draft slice) | A draft row already has `publishedAt` null. “Never published **for this locale**” means there is **no sibling row** with the same `(documentId, locale)` and non-null `publishedAt`. That is an existence predicate over two rows, not a scalar filter on the current row. |
| `has-published-version`         | Requires a **correlated** check: published sibling exists, and (for the definition above) draft sibling exists—again two-row logic.                                                                                                                                        |
| `modified` / `unmodified`       | Requires comparing **draft.updatedAt** to **published.updatedAt** for the same pair. `publishedAt` is when the published row was published; it does not encode whether the draft has diverged since.                                                                       |

Clients could approximate some of this with multiple requests, client-side joins, or custom code—but that duplicates product rules, risks drift from the document service, and cannot benefit from one optimized server-side plan. The parameter exists for **correctness** (one canonical definition), **ergonomics** (single query), and **performance** (subqueries / joins the platform can optimize).

### Query translation contract

Public query params normalize to binary status plus derived constraints. Implementations use **`(documentId, locale)`-aware** predicates for localized content types so cohorts like `never-published` and `has-published-version` are **pair-scoped**, not merely document-scoped.

| Public query                                                 | Internal normalized behavior (conceptual)                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `status=draft`                                               | `status='draft'`                                                                                                         |
| `status=published`                                           | `status='published'`                                                                                                     |
| `status=draft&publicationFilter=never-published`             | Draft rows for pairs with **no** published row for the same `(documentId, locale)`                                       |
| `status=published&publicationFilter=never-published`         | Intersection of “published row” with “pair has no published version”—**empty** in consistent data (degenerate but valid) |
| `status=draft&publicationFilter=has-published-version`       | Draft rows for pairs where a published row **also** exists for the same `(documentId, locale)`                           |
| `status=published&publicationFilter=has-published-version`   | Published rows for pairs where a draft row **also** exists (excludes published-only orphans for that pair)               |
| `status=draft&publicationFilter=modified`                    | Draft rows for pairs where `draft.updatedAt > published.updatedAt`                                                       |
| `status=published&publicationFilter=modified`                | Published rows for pairs where `draft.updatedAt > published.updatedAt`                                                   |
| `status=draft&publicationFilter=unmodified`                  | Draft rows for pairs where `draft.updatedAt <= published.updatedAt`                                                      |
| `status=published&publicationFilter=unmodified`              | Published rows for pairs where `draft.updatedAt <= published.updatedAt`                                                  |
| `…&publicationFilter=never-published-document`               | Same intent as `never-published`, scoped to **document** (see semantics above)                                           |
| `…&publicationFilter=has-published-version-document`         | Same intent as `has-published-version`, scoped to **document**                                                           |
| `status=published&publicationFilter=published-without-draft` | Published rows whose pair has **no** draft row                                                                           |
| `status=published&publicationFilter=published-with-draft`    | Published rows whose pair **has** a draft row                                                                            |

If `status` is omitted:

- REST resolves default `status='published'` first.
- Direct document service resolves default `status='draft'` first.

### Validation and compatibility

Validation happens after status resolution (explicit or defaulted):

- `publicationFilter` values are accepted with both `status=draft` and `status=published`.
- Some combinations are valid but degenerate by nature:
  - `status=published&publicationFilter=never-published` normally resolves to an empty result set.
- Invalid parameter values (unknown `publicationFilter`, malformed params) return 400.

Compatibility:

- GraphQL exposes optional `publicationFilter` via the `PublicationFilter` enum; internal values match REST (`never-published`, …). Deprecated `hasPublishedVersion` is still accepted and normalized to document-scoped `publicationFilter` values for queries and relation resolution.

Mutation semantics (`create`, `update`, `publish`, `unpublish`) do not change.

### Deprecated `hasPublishedVersion`

The legacy boolean `hasPublishedVersion` (`true` / `false`, or string `"true"` / `"false"`) is **deprecated** in favor of `publicationFilter`. Implementations resolve it to:

- `false` → `never-published-document`
- `true` → `has-published-version-document`

so that a single code path (`publicationFilter` translation) handles both the new parameter and backward compatibility. Invalid values yield the same validation errors as before.

### Implementation outline

1. Extend allowlists and validators to accept `publicationFilter` (and validate unknown values with HTTP 400 / GraphQL input rules as appropriate).
2. Resolve status defaults as today (no changes to REST/document service defaulting).
3. Translate `publicationFilter` into derived constraints before final query execution (prefer correlated subqueries or joins on `(documentId, locale)` for localized types; document-scoped modes use document-level predicates).
4. Reuse patterns where possible; for localized types, avoid document-only existence checks when pair-scoped cohort semantics are required.
5. Normalize deprecated `hasPublishedVersion` to document-scoped `publicationFilter` modes so one implementation path applies all cohorts.

### Future options (orthogonal)

- Time-window variants (for example, “stale” modified content).
- Locale completeness variants (for example, published in locale A but missing locale B).

## Example

Request examples:

```http
GET /api/articles?status=draft&publicationFilter=never-published
```

Returns draft rows from the never-published cohort.

```http
GET /api/articles?publicationFilter=modified
```

With `status` omitted, REST resolves `status=published` by default, then applies `modified`.

```ts
await strapi.documents('api::article.article').findMany({ publicationFilter: 'modified' });
```

With `status` omitted, direct document service resolves `status=draft` first, then validates and applies `publicationFilter`.

## Tradeoffs

- Preserves current status contract and defaults.
- Adds high-value derived publication queries to public APIs.
- Avoids persistence/model changes.
- Requires clear documentation because default status differs by surface (REST vs direct document service).
- `modified`/`unmodified` can be expensive on large datasets without optimized query paths.
- Combination matrix must be validated carefully to avoid ambiguity.
- Pair-scoped semantics should be explicit in docs and OpenAPI so clients do not confuse cohort filters with plain `publishedAt` checks.

## Alternatives

### A) Extend `status` itself with extra values

Example: `status=published-modified`, `status=published-unmodified`.

Why not preferred:

- Overloads `status` with two concepts (version slice vs derived mode).
- Increases risk in code (both internal and user code) that currently assumes only `draft|published`.
- Harder to keep mutation/read semantics clean and obvious.

### B) Rely only on a coarse boolean “published row exists for documentId” filter

Why not preferred:

- Does not address `modified` / `unmodified`, scales poorly as more derived publication states are introduced, and does not express **locale-level** never / has-published cohorts.
- Leaves users without a complete public query model for common publication workflows.

### C) Add a persisted status column

Why not preferred:

- Contradicts current model and introduces unnecessary storage complexity.
- Derived states are computable and should remain derived.

### D) Require `status` whenever `publicationFilter` is provided

Why not preferred:

- Breaks existing defaulting ergonomics and diverges from current API behavior.
- Creates unnecessary migration pressure for clients that currently rely on implicit defaults.
- Not required technically; inherited defaults can be resolved deterministically before validation.

## Resources

- `docs/docs/rfcs/example.md`
- Content Manager status filter implementation in `packages/core/content-manager/admin/src/pages/ListView/components/Filters.tsx`
- Content Manager derived status handling in `packages/core/content-manager/server/src/controllers/collection-types.ts`
- Document service query transformations in `packages/core/core/src/services/document-service/transform/query.ts`
