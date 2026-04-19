---
title: Custom indexes
description: How to add a database index on an attribute
tags:
  - database
  - schema
  - content-type-builder
---

You can add a **database index** on a column to speed up queries. In the Content-Type Builder (when the future flag is enabled), use the **Add database index** checkbox on an attribute. In the schema, add an entry to the content type’s `indexes` array.

## Schema shape

Use the content type’s `indexes` array with `type: "index"` and `attributes: [attributeName]`:

```json
{
  "indexes": [
    { "type": "index", "attributes": ["slug"] },
    { "type": "index", "attributes": ["emailField"] }
  ],
  "attributes": {
    "slug": { "type": "string" },
    "emailField": { "type": "email" }
  }
}
```

Each entry with `type: "index"` (or no `type`) creates a non-unique index on the resolved column(s). Only non-unique indexes are applied; any `type: "unique"` entries in `indexes` are ignored for now. You can also use legacy **column names** in `indexes` (e.g. `columns: ["folder_path"]`) instead of `attributes`.

## Where it's implemented

- **Schema → model**: `packages/core/core/src/utils/transform-content-types-to-models.ts` — indexes are built from the content type’s `indexes` array (non-unique only; `type: "unique"` is ignored).
- **Database**: `packages/core/database` — schema builder creates/drops indexes during migrations.
- **Content-Type Builder**: The **Add database index** checkbox is gated by the future flag `unstableContentTypeBuilderIndexing`. See [Future flags](/docs/06-future-flags).

## Future flag

The **Add database index** option in the Content-Type Builder is behind:

- **Flag**: `unstableContentTypeBuilderIndexing`
- **Config**: `config/features.(js|ts)` → `future.unstableContentTypeBuilderIndexing`

When the flag is off (default), the checkbox is hidden; schema-defined `indexes` still apply at the database level.
