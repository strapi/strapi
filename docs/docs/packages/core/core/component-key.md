---
title: Durable strapiComponentKey for nested components
description: Add a stable strapiComponentKey identity for component instances across draft/publish clones so Content API clients can round-trip nested updates without relying on status-local numeric ids
tags:
  - backend
  - public-api
  - tech-design
status: draft
review_notes:
  - Design proposal for an unreleased feature (draft PR stack); verify against the code once merged.
---

# Durable `strapiComponentKey` for nested components

**Status:** Draft  
**Related docs:** [Updating repeatable components](https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/do-not-update-repeatable-components-with-document-service-api)

## Summary

Documents have a stable `documentId` across draft/publish. Nested components only have status-local numeric `id`s. Publishing creates new component rows, so the draft and published versions of the “same” block have different `id`s.

That breaks the natural Content API round-trip:

1. REST `GET` returns **published** component `id`s
2. `PUT` / Document Service `update` writes the **draft**
3. Reusing published `id`s fails (`Some of the provided components … are not related to the entity`)

Today’s supported workaround is to omit ids and replace the whole component array (recreate). That remains valid and non-breaking. This RFC adds an additive durable identity so clients can also do v4-style targeted updates safely.

## Goals

- Non-breaking: omit-id full-array replace keeps working; draft-`id` updates keep working (Content Manager).
- Honest identity: do **not** silently remap a bare published numeric `id` → draft row; a foreign `id` is only replaced when it comes with a `strapiComponentKey` that resolves on the parent.
- Align with the `documentId` mental model: stable handle for the logical nested block; `id` remains the row PK.
- Fail closed: unknown / foreign keys reject like invalid ids.

## Non-goals

- Silent published→draft numeric `id` remapping as the permanent contract.
- Treating components as full documents (no independent D&P lifecycle).
- Relation-style `set` / `update` / `remove` grammar (possible follow-up once keys exist).

## Proposal

Add a system attribute **`strapiComponentKey`** (string, cuid2) on every component model:

| Field                | Meaning                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `id`                 | Database row for this status/locale parent (ephemeral across publish)    |
| `strapiComponentKey` | Logical instance identity (copied on publish/discard; reminted on clone) |

Draft and published remain **separate rows** with separate field values. They may share a `strapiComponentKey` when they represent the same logical block after publish.

### Behavior

1. **Create** — the server assigns `strapiComponentKey`, like `documentId`: Document Service `create` (and the new-locale create inside `update`) strips client-supplied keys before writing, so `createComponent` mints them.
2. **Publish / discard** — funnel through `createComponents` → `createComponent`; keys copy with other scalars.
3. **Document clone** — strip source `strapiComponentKey`s so `createComponent` mints **new** keys (clone is a new document, same as a new `documentId`).
4. **Update** — before delete/update, resolve payload `strapiComponentKey` → row `id` on the **parent being updated** (usually draft). Unknown keys without an `id` → ApplicationError.
   - An `id` that belongs to the parent wins over `strapiComponentKey`.
   - An `id` that does not belong to the parent (for example the published row echoed back with its key) is replaced by the row matching `strapiComponentKey`. With no matching key, the foreign `id` is rejected as before.
   - Each row is claimed once per field: a key repeated in the same field (copied block) becomes a new component with a fresh key and never updates the block it was copied from.
   - New components (no `id`) have nested keys stripped so copied sub-trees get fresh keys.
5. **Omit-id full replace** — unchanged.
6. **Update by draft `id`** — unchanged.

### Security

- Resolve only against components linked to the parent entity under update (and `__component` for dynamic zones).
- Do not allow reassigning `strapiComponentKey` on update.
- Never resolve by bare published numeric `id` across statuses.
- Client-supplied keys are ignored on create, so a client cannot pick or duplicate keys.

### Migration

1. Schema sync adds `strapi_component_key` (system attribute on component models).
2. Internal migration backfills a unique key per existing row.
3. Twins share keys after the **next publish** (key copied draft → published). Optional follow-up: twin existing pairs by parent + field + order without re-publish.

## Implementation sketch

Primary touchpoints:

- `transform-content-types-to-models.ts` — add `strapiComponentKey` for `modelType === 'component'`
- `document-service/components.ts` — assign/preserve on create; resolve key→id in `updateComponents`
- `@strapi/utils` `ID_FIELDS` includes `strapiComponentKey`. `componentKey` / `component_key` stay available to user schemas; `strapi*` is already reserved.
- Internal migration `5.0.0-07-component-key`
- API tests under `tests/api/core/strapi/document-service/component-key.test.api.ts`

## Follow-ups

- [ ] GraphQL / OpenAPI surfacing
- [x] data-transfer `createComponent` parity
- [x] Unskip Content API component-id tests; add REST `strapiComponentKey` cases
- [ ] Best-effort twinning migration for existing draft/published pairs
- [ ] Public docs: document round-trip; retire “not recommended” once shipped
- [ ] Consider whether REST should de-emphasize numeric component `id` in examples

## Acceptance criteria

- [x] Create component → response includes `strapiComponentKey`
- [x] Publish → draft and published rows share the same `strapiComponentKey`, different `id`
- [x] Load published → update with `\{ strapiComponentKey, …fields \}` updates the draft instance
- [x] Omit-id array replace still works
- [x] Invalid / foreign `strapiComponentKey` → 400
- [x] Echoed published `id` + `strapiComponentKey` updates the draft instance
- [x] Client keys ignored on create; a repeated key in one field creates a new block
- [x] Nested components + dynamic zones covered
- [x] Document clone mints new `strapiComponentKey`s
