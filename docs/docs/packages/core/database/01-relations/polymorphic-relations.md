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

When an inverse `morphOne` / `morphMany` targets a `morphToOne`, `attachRelations` writes the owner into the morph columns of the target rows (first entry for `morphOne`, every entry for `morphMany`). It reads `set`, then `connect`, and throws on an empty value. Each target row stores a single owner, so the copy flows do not copy these links. A copy flow passes the populated value of the version it copies: a `morphMany` reaches that check as an empty list, while an empty `morphOne` populates as `null` or `undefined` and is skipped before it. The list below covers `morphMany`; the `morphOne` case is noted per flow.

- **Publish** omits the empty value before `create` (`packages/core/core/src/services/document-service/entries.ts`). The links on the draft stay on the draft. Before deleting the old published version, publish loads the target rows it owns (data migrated from v4, where the existing rows became the published versions, or a target row set to the published id); after creating the new published version, it re-points them to it (`packages/core/core/src/services/document-service/utils/inverse-morph-relations.ts`). It reads the new published versions from the database and matches them to the old ones by locale, so the caller's `fields` param does not change the result. It moves only the rows that are still ownerless, so a row another write re-owned in between keeps its new owner. Then publish reads its response again, so a `populate` lists the moved links. So each version keeps the links it had. If an old published version that owns links has no new version (a publish without a draft), publish throws an `InvalidRelationError` and the transaction rolls back. This also covers `morphOne`.
- **Discard draft** throws. It deletes the old draft, which clears the morph columns of its target rows, then creates the new draft from the published version. Skipping the empty value there would drop every link, so the error rolls the transaction back instead. For a `morphOne`, discard draft goes through and drops the link of the old draft.
- **Enabling draft & publish** on such a type runs the draft & publish migration, which calls discard draft on every published row (`packages/core/core/src/migrations/draft-publish.ts`). It throws, so Strapi fails at boot, on every start, while that type has published rows.
- **Clone** throws (`clone` in `packages/core/core/src/services/document-service/repository.ts`). For a `morphOne`, clone goes through: the clone has no link, and the source keeps its link.

Each of these errors is an `InvalidRelationError`, so a request that hits it gets a 400 `ValidationError` with its message instead of a 500 (`packages/core/core/src/utils/database-input-errors.ts`).

What discard draft, enabling draft & publish, and clone should do with these links is not decided.

On update, `updateRelations` writes the same morph columns. An array, a `{ set: [...] }` or a bare `null` replaces the links: it clears every target row that points to the entry, then links the first entry for `morphOne` and every entry for `morphMany`. An empty array, `{ set: [] }` or `null` leaves no link. `{ set: null }` is different: `toAssocs` drops the null `set`, so it arrives as an empty delta and changes nothing, as for regular relations (see #27432 above). Without a `set`, `disconnect` clears only the given rows that point to the entry, and `connect` links the given rows and keeps the existing links. A target row stores a single owner, so `connect` moves a row away from the entry that owned it. On a `morphOne`, `connect` replaces the linked row. An empty delta (`{ connect: [], disconnect: [] }`, which the admin sends on save) changes nothing. Through the Content API, items need `__type` (`{ documentId, __type }`) to resolve their target, and the array form rejects `__type`, so a REST client sends `{ set }`, `{ connect }` or `{ disconnect }`.

**Reads (populate)** — `packages/core/database/src/query/helpers/populate/apply.ts` dispatches on `attribute.relation`. `morphToOne` and `morphToMany` load target rows per type; inverse `morphOne` / `morphMany` traverse the inverse. Polymorphic targets use `populate.on` in the query for per-UID options. The populated object for a morph item sets the type discriminator **after** target row fields so the target content-type UID (in `typeField`, default `__type`) is always authoritative if a name collides.

## Document service

**Deep populate** — `packages/core/core/src/services/document-service/utils/populate.ts` (`getDeepPopulate`) must include all DB-backed relation attributes (including morph kinds, excluding `unstable_virtual` ones) so flows that copy full entry trees—**publish**, **discardDraft**, **clone** in `repository.ts`—load related data. Those call sites pass `relationalFields` (e.g. `documentId` / `locale` or `id`) as needed for the copy.

**Relation transforms** — `packages/core/core/src/services/document-service/transform/relations/utils/map-relation.ts` (`traverseEntityRelations`) does **not** visit `morphToOne` like join-based relations: inline morph columns are applied in the entity manager’s `processData`, not through the `documentId` → entity `id` map used for other relations. Other polymorphic **join** relations still go through the normal extract/transform path where applicable.

`publish` / `discard` entry points: `packages/core/core/src/services/document-service/entries.ts` use `transformData` with the above traversal.

## Validation, API surface, and tests

**Query / validation** — Polymorphic helpers and populate rules live under `packages/core/utils/src` (e.g. `relations.ts`, query-populate and query-param conversion). Some sort/filter combinations are limited for morph relations in the relevant validation paths.

**Plugins** — GraphQL helpers: `packages/plugins/graphql/server/src/services/content-api/register-functions/polymorphic.ts` and related type builders.

**Tests** — Media connect / disconnect deltas and `singleRow`: `tests/api/core/content-manager/media/media-delta-payloads.test.api.js`. REST and broader relation behavior: `tests/api/core/strapi/api/relations.test.api.ts`, `tests/api/core/strapi/api/populate/`. Document service flows with morph relations: `tests/api/core/strapi/document-service/relations/polymorphic.test.api.ts`. Unit coverage includes database populate (`query/helpers/populate` tests) and document-service populate / relation utilities where relevant.
