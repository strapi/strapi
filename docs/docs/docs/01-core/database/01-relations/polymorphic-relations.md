---
title: Polymorphic relations
description: Storage, read/write paths, and document service behavior for morph* relations
tags:
  - database
  - relations
  - document-service
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

**Reads (populate)** — `packages/core/database/src/query/helpers/populate/apply.ts` dispatches on `attribute.relation`. `morphToOne` and `morphToMany` load target rows per type; inverse `morphOne` / `morphMany` traverse the inverse. Polymorphic targets use `populate.on` in the query for per-UID options. The populated object for a morph item sets the type discriminator **after** target row fields so the target content-type UID (in `typeField`, default `__type`) is always authoritative if a name collides.

## Document service

**Deep populate** — `packages/core/core/src/services/document-service/utils/populate.ts` (`getDeepPopulate`) must include all DB-backed relation attributes (including morph kinds, excluding `unstable_virtual` ones) so flows that copy full entry trees—**publish**, **discardDraft**, **clone** in `repository.ts`—load related data. Those call sites pass `relationalFields` (e.g. `documentId` / `locale` or `id`) as needed for the copy.

**Relation transforms** — `packages/core/core/src/services/document-service/transform/relations/utils/map-relation.ts` (`traverseEntityRelations`) does **not** visit `morphToOne` like join-based relations: inline morph columns are applied in the entity manager’s `processData`, not through the `documentId` → entity `id` map used for other relations. Other polymorphic **join** relations still go through the normal extract/transform path where applicable.

`publish` / `discard` entry points: `packages/core/core/src/services/document-service/entries.ts` use `transformData` with the above traversal.

## Validation, API surface, and tests

**Query / validation** — Polymorphic helpers and populate rules live under `packages/core/utils/src` (e.g. `relations.ts`, query-populate and query-param conversion). Some sort/filter combinations are limited for morph relations in the relevant validation paths.

**Plugins** — GraphQL helpers: `packages/plugins/graphql/server/src/services/content-api/register-functions/polymorphic.ts` and related type builders.

**Tests** — REST and broader relation behavior: `tests/api/core/strapi/api/relations.test.api.ts`, `tests/api/core/strapi/api/populate/`. Document service flows with morph relations: `tests/api/core/strapi/document-service/relations/polymorphic.test.api.ts`. Unit coverage includes database populate (`query/helpers/populate` tests) and document-service populate / relation utilities where relevant.
