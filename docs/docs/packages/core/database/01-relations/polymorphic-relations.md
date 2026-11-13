---
title: Polymorphic relations
description: Storage, read/write paths, and document service behavior for morph* relations
tags:
  - relations
---

# Polymorphic relations

Strapi’s polymorphic relation kinds are **`morphToOne`**, **`morphToMany`**, and the inverse sides **`morphOne`** and **`morphMany`**. Public schema shape: `packages/core/types/src/schema/attribute/definitions/relation.ts`. Database relation shapes: `packages/core/database/src/types/index.ts`. Metadata (how they map to columns / join tables): `packages/core/database/src/metadata/relations.ts`.

| Kind                     | Storage (summary)                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `morphToOne`             | Inline columns on the **owner** row: target id + target type.                                         |
| `morphToMany`            | **Join table**: owner id, polymorphic target id + type, ordering.                                     |
| `morphOne` / `morphMany` | **Inverse**; data lives on the `morphToOne` / `morphToMany` side; resolved via `morphBy` in populate. |

## Database layer

**Writes** — `packages/core/database/src/entity-manager/index.ts`: `processData` maps `morphToOne` input (`id` + `typeField`, default `__type`) into inline columns; `attachRelations` / `updateRelations` handle `morphToMany` through join tables. `packages/core/database/src/entity-manager/morph-relations.ts` encodes join rows and related cleanup (e.g. when `morphOne` enforces a single inverse).

**Connect / disconnect on the inverse side** — When an entry writes a `morphOne` / `morphMany` that targets a `morphToMany` (media: `plugin::upload.file.related`), `updateRelations` follows the same rule as join-table relations. A payload without `set` is a delta: `{ connect: [] }`, `{ disconnect: [] }` and `{}` leave the field unchanged, `connect` adds rows, `disconnect` removes only the listed rows. A payload with `set`, or a plain id / array, replaces the field. `attachRelations` honours `set` or `connect` on create.

**`singleRow`** — `Relation.MorphOne` carries an internal `singleRow: true` flag that `@strapi/core` sets for single media in `transformAttribute` (`packages/core/core/src/utils/transform-content-types-to-models.ts`). Only flagged attributes are last-wins: the write deletes every row for the field and keeps the last connected item, so the field holds one join row. A generic `morphOne` has no flag and keeps every row it is given, for example the draft and published target rows the Document Service expands one `documentId` into. The owner-side cleanup in `morph-relations.ts` still reduces every `morphOne` to one row; the two paths are not aligned yet.

**`{ set: null }` on media** — `toAssocs` drops a null `set`, so the morph branch sees an empty delta. A guard keeps the released behaviour: a bare `{ set: null }` clears a media field, and `{ set: null }` next to `connect` / `disconnect` applies the delta. Regular relations treat a bare `{ set: null }` as a no-op. The unified meaning is tracked in [#27432](https://github.com/strapi/strapi/issues/27432).

**Reads (populate)** — `packages/core/database/src/query/helpers/populate/apply.ts` dispatches on `attribute.relation`. `morphToOne` and `morphToMany` load target rows per type; inverse `morphOne` / `morphMany` traverse the inverse. Polymorphic targets use `populate.on` in the query for per-UID options. The populated object for a morph item sets the type discriminator **after** target row fields so the target content-type UID (in `typeField`, default `__type`) is always authoritative if a name collides.

## Document service

**Deep populate** — `packages/core/core/src/services/document-service/utils/populate.ts` (`getDeepPopulate`) must include all DB-backed relation attributes (including morph kinds, excluding `unstable_virtual` ones) so flows that copy full entry trees—**publish**, **discardDraft**, **clone** in `repository.ts`—load related data. Those call sites pass `relationalFields` (e.g. `documentId` / `locale` or `id`) as needed for the copy.

**Relation transforms** — `packages/core/core/src/services/document-service/transform/relations/utils/map-relation.ts` (`traverseEntityRelations`) does **not** visit `morphToOne` like join-based relations: inline morph columns are applied in the entity manager’s `processData`, not through the `documentId` → entity `id` map used for other relations. Other polymorphic **join** relations still go through the normal extract/transform path where applicable.

`publish` / `discard` entry points: `packages/core/core/src/services/document-service/entries.ts` use `transformData` with the above traversal.

## Validation, API surface, and tests

**Query / validation** — Polymorphic helpers and populate rules live under `packages/core/utils/src` (e.g. `relations.ts`, query-populate and query-param conversion). Some sort/filter combinations are limited for morph relations in the relevant validation paths.

**Plugins** — GraphQL helpers: `packages/plugins/graphql/server/src/services/content-api/register-functions/polymorphic.ts` and related type builders.

**Tests** — Media connect / disconnect deltas and `singleRow`: `tests/api/core/content-manager/media/media-delta-payloads.test.api.js`. REST and broader relation behavior: `tests/api/core/strapi/api/relations.test.api.ts`, `tests/api/core/strapi/api/populate/`. Document service flows with morph relations: `tests/api/core/strapi/document-service/relations/polymorphic.test.api.ts`. Unit coverage includes database populate (`query/helpers/populate` tests) and document-service populate / relation utilities where relevant.
