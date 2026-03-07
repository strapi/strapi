---
title: Custom indexes
description: How custom database indexes are defined in schemas and applied
tags:
  - database
  - schema
  - content-type-builder
---

Content types can declare custom database indexes in their schema. Indexes are normalized in core, then applied by the database layer during [migrations](/docs/01-core/database/03-migrations). Both legacy column-based definitions and attribute-based definitions (preferred, Admin UI–friendly) are supported.

## Schema shape

In a content-type schema, use the `indexes` array:

```json
{
  "indexes": [
    { "name": "legacy_idx", "columns": ["folder_path"], "type": "unique" },
    { "attributes": ["title", "locale"], "type": "index" },
    { "attributes": ["slug"], "type": "unique", "scope": "global" },
    { "attributes": ["headline", "category"], "type": "unique", "scope": "variant" }
  ]
}
```

- **`columns`** — Legacy: raw database column names. Pass-through behavior; no Strapi-specific expansion.
- **`attributes`** — Preferred: Strapi attribute names. Resolved to DB columns (including i18n/draft-publish columns) during schema transformation.
- **`type`** — `"unique"` or `"index"` (non-unique). Primary key is handled separately.
- **`scope`** — For **unique** attribute-based indexes only:
  - **`global`** — Unique across the whole table (indexed attributes only).
  - **`variant`** — Unique per variant: indexed attributes plus all variant dimensions (e.g. `locale`, and for draft-and-publish content types, `published_at`). Draft and published versions of the same document do not conflict.

Publication state is always handled so that the same indexed value is allowed for draft and published rows that share the same `documentId`; uniqueness is enforced across different documents according to the chosen scope.

## How attribute-based unique indexes become multi-column

Attribute-based **unique** indexes are never stored as a single-column index on the attribute alone. The schema transformation layer expands them into multi-column unique indexes so that Strapi's document and variant semantics are enforced at the database level.

**Columns that are added automatically:**

1. **`published_at`** (when the content type has Draft & Publish)  
   Added for every attribute-based **unique** index, regardless of scope.  
   **Reason:** In Draft & Publish there are two rows per document (draft and published). The same attribute value (e.g. `slug = "about"`) must be allowed on both rows for the _same_ document, but still be unique across _different_ documents. Including `published_at` in the index key makes the key `(slug, published_at)`: the draft row has `published_at = NULL`, the published row has a timestamp, so they no longer conflict. Uniqueness is still enforced across documents because two different documents with the same slug would still need to differ in draft vs published (or we'd have two drafts or two published with the same slug, which the index forbids).

2. **`locale`** (when `scope === "variant"` and the content type has i18n)  
   **Reason:** "Variant" means unique per locale. The same value (e.g. `slug = "about"`) is allowed in each locale; the index key becomes `(slug, published_at?, locale)` so entries in different locales do not conflict.

**Resulting index examples (after normalization):**

| Schema                                                             | Content type | Actual DB unique index columns |
| ------------------------------------------------------------------ | ------------ | ------------------------------ |
| `{ "attributes": ["slug"], "type": "unique", "scope": "global" }`  | D&P, i18n    | `(slug, published_at)`         |
| `{ "attributes": ["slug"], "type": "unique", "scope": "variant" }` | D&P, i18n    | `(slug, published_at, locale)` |
| `{ "attributes": ["slug"], "type": "unique", "scope": "global" }`  | no D&P, i18n | `(slug)`                       |
| `{ "attributes": ["slug"], "type": "unique", "scope": "variant" }` | no D&P, i18n | `(slug, locale)`               |

Non-unique (`type: "index"`) attribute-based indexes are not expanded: they stay as the resolved attribute column(s) only. Legacy `columns`-based indexes are never expanded; they are applied as given.

## Where it's implemented

- **Schema → model transformation**: `packages/core/core/src/utils/transform-content-types-to-models.ts` — `normalizeIndexes()` turns `attributes` + `scope` into concrete column lists (including variant dimensions and `published_at` for D&P).
- **Database DDL**: `packages/core/database` — schema builder creates/drops indexes; duplicate/conflicting index definitions are filtered before creation to avoid migration failures.
- **Content-Type Builder UI**: Indexing controls (Unique global/variant, Index non-unique) are gated by the **future flag** `unstableContentTypeBuilderIndexing`. When a unique index is set in the UI, the attribute's `unique` property is forced on for application-level validation. See [Future flags](/docs/06-future-flags) for how to enable it.

## Future flag

The Content-Type Builder UI for configuring attribute-based indexes is behind:

- **Flag**: `unstableContentTypeBuilderIndexing`
- **Config**: `config/features.(js|ts)` → `future.unstableContentTypeBuilderIndexing`

When the flag is off (default), the indexing section is hidden; schema-defined indexes still apply at the database level.
