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

This RFC proposes an optional `publicationFilter` query parameter for the document service and REST API.
The goal is to expose derived publication queries without changing the existing `status` contract (`draft`, `published`) or existing default behavior.

The change is intentionally non-breaking:

- Existing query behavior for `status=draft|published` remains unchanged.
- Existing response payloads remain unchanged.
- Existing persistence model remains unchanged (all publication states are derived, not stored as a status column).
- Existing defaulting behavior remains unchanged:
  - Core REST API default status is `published`.
  - Direct document service default status is `draft`.

## Detailed design

### API shape

- Keep `status` unchanged (`draft`, `published`).
- Add optional `publicationFilter` with initial values:
  - `never-published`
  - `has-published-version`
  - `modified`
  - `unmodified`

If `publicationFilter` is omitted, behavior is unchanged.

### Semantics

`publicationFilter` selects a derived cohort of `(documentId, locale)` pairs.
The resolved `status` then chooses which slice to return (`draft` or `published`) from that cohort.
The same `publicationFilter` can therefore be used with either status where meaningful.

- `never-published`: no published counterpart exists for the same `(documentId, locale)`.
- `has-published-version`: a published counterpart exists for the same `(documentId, locale)`.
- `modified`: draft counterpart is newer (`draft.updatedAt > published.updatedAt`).
- `unmodified`: draft counterpart is not newer (`draft.updatedAt <= published.updatedAt`).

Some combinations are naturally degenerate (for example, the selected status slice is empty for the chosen cohort).
Degenerate combinations should return empty results, not validation errors.

When `status` is omitted, status is first resolved from current defaults, then `publicationFilter` rules are applied.

### Query translation contract

Public query params normalize to binary status plus derived constraints:

| Public query                                               | Internal normalized behavior                                                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `status=draft`                                             | `status='draft'`                                                                                                                  |
| `status=published`                                         | `status='published'`                                                                                                              |
| `status=draft&publicationFilter=never-published`           | `status='draft'` + `hasPublishedVersion=false` (or equivalent `documentId NOT IN (published-subquery)`)                           |
| `status=published&publicationFilter=never-published`       | `status='published'` + never-published cohort (expected empty set in normal data)                                                 |
| `status=draft&publicationFilter=has-published-version`     | `status='draft'` + `hasPublishedVersion=true` (or equivalent `documentId IN (published-subquery)`)                                |
| `status=published&publicationFilter=has-published-version` | `status='published'` + has-published-version cohort (usually equivalent to published rows within the current locale/filter scope) |
| `status=draft&publicationFilter=modified`                  | `status='draft'` + `filters.documentId IN <ids where draft.updatedAt > published.updatedAt for same (documentId, locale)>`        |
| `status=published&publicationFilter=modified`              | `status='published'` + `filters.documentId IN <ids where draft.updatedAt > published.updatedAt for same (documentId, locale)>`    |
| `status=draft&publicationFilter=unmodified`                | `status='draft'` + `filters.documentId IN <ids where draft.updatedAt <= published.updatedAt for same (documentId, locale)>`       |
| `status=published&publicationFilter=unmodified`            | `status='published'` + `filters.documentId IN <ids where draft.updatedAt <= published.updatedAt for same (documentId, locale)>`   |

If `status` is omitted:

- REST resolves default `status='published'` first.
- Direct document service resolves default `status='draft'` first.

### Validation and compatibility

Validation happens after status resolution (explicit or defaulted):

- `publicationFilter` values are accepted with both `status=draft` and `status=published`.
- Some combinations are valid but degenerate by nature:
  - `status=published&publicationFilter=never-published` normally resolves to an empty result set.
  - `status=published&publicationFilter=has-published-version` is typically equivalent to published rows within the current locale/filter scope.
- Invalid parameter values (unknown `publicationFilter`, malformed params) return 400.

Compatibility:

- Keep `hasPublishedVersion` supported.
- `publicationFilter=never-published|has-published-version` can map internally to existing `hasPublishedVersion` behavior.
- Mutation semantics (`create`, `update`, `publish`, `unpublish`) do not change.

### Implementation outline

1. Extend allowlists and validators to accept `publicationFilter`.
2. Resolve status defaults as today (no changes to REST/document service defaulting).
3. Translate `publicationFilter` into derived constraints before final query execution.
4. Reuse existing patterns:
   - Published counterpart existence subquery (`hasPublishedVersion` pattern).
   - Draft/published timestamp comparison (`modified` / `unmodified` pattern).

### Future options (not in initial scope)

Potential future filters:

- `no-draft-version` (diagnostics/cleanup)
  - Theoretically impossible in normal Strapi D&P flows because a draft is expected.
  - Still useful to detect bad legacy or manually corrupted data.
- `has-draft-version`
- Time-window variants (for example, stale modified content)
- Locale completeness variants

Future translation examples:

| Public query                                           | Internal normalized behavior                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `status=published&publicationFilter=no-draft-version`  | `status='published'` + `filters.documentId NOT IN <ids with draft row for same (documentId, locale)>` |
| `status=published&publicationFilter=has-draft-version` | `status='published'` + `filters.documentId IN <ids with draft row for same (documentId, locale)>`     |

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

## Alternatives

### A) Extend `status` itself with extra values

Example: `status=published-modified`, `status=published-unmodified`.

Why not preferred:

- Overloads `status` with two concepts (version slice vs derived mode).
- Increases risk in code (both internal and user code) that currently assumes only `draft|published`.
- Harder to keep mutation/read semantics clean and obvious.

### B) Keep only `hasPublishedVersion` and do nothing else

Why not preferred:

- Does not address `modified` / `unmodified`, and scales poorly as more derived publication states are introduced.
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
