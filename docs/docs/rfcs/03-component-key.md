---
title: Durable componentKey for nested components
description: Add a stable componentKey identity for component instances across draft/publish clones so Content API clients can round-trip nested updates without relying on status-local numeric ids
tags:
  - content-api
  - document-service
  - components
  - draft-and-publish
---

# Durable `componentKey` for nested components

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
- Honest identity: do **not** silently remap published numeric `id` → draft row.
- Align with the `documentId` mental model: stable handle for the logical nested block; `id` remains the row PK.
- Fail closed: unknown / foreign keys reject like invalid ids.

## Non-goals

- Silent published→draft numeric `id` remapping as the permanent contract.
- Treating components as full documents (no independent D&P lifecycle).
- Relation-style `set` / `update` / `remove` grammar (possible follow-up once keys exist).

## Proposal

Add a system attribute **`componentKey`** (string, cuid2) on every component model:

| Field          | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| `id`           | Database row for this status/locale parent (ephemeral across publish) |
| `componentKey` | Logical instance identity (copied on publish/clone/discard)           |

Draft and published remain **separate rows** with separate field values. They may share a `componentKey` when they represent the same logical block after publish/clone.

### Behavior

1. **Create** — mint `componentKey` if absent; preserve if present (publish/clone path).
2. **Publish / discard / clone** — funnel through `createComponents` → `createComponent`; keys copy with other scalars.
3. **Update** — before delete/update, resolve payload `componentKey` → row `id` on the **parent being updated** (usually draft). Unknown keys → ApplicationError.
4. **Omit-id full replace** — unchanged.
5. **Update by draft `id`** — unchanged.

### Security

- Resolve only against components linked to the parent entity under update (and `__component` for dynamic zones).
- Do not allow reassigning `componentKey` on update.
- Never resolve by bare published numeric `id` across statuses.

### Migration

1. Schema sync adds `component_key` (system attribute on component models).
2. Internal migration backfills a unique key per existing row.
3. Twins share keys after the **next publish** (key copied draft → published). Optional follow-up: twin existing pairs by parent + field + order without re-publish.

## Implementation sketch

Primary touchpoints:

- `transform-content-types-to-models.ts` — add `componentKey` for `modelType === 'component'`
- `document-service/components.ts` — assign/preserve on create; resolve key→id in `updateComponents`
- `@strapi/utils` `ID_FIELDS` + reserved `component_key`
- Internal migration `5.0.0-07-component-key`
- API tests under `tests/api/core/strapi/document-service/component-key.test.api.ts`

## Follow-ups

- [ ] GraphQL / OpenAPI surfacing
- [ ] data-transfer `createComponent` parity
- [ ] Unskip Content API component-id tests; add REST `componentKey` cases
- [ ] Best-effort twinning migration for existing draft/published pairs
- [ ] Public docs: document round-trip; retire “not recommended” once shipped
- [ ] Consider whether REST should de-emphasize numeric component `id` in examples

## Acceptance criteria

- [ ] Create component → response includes `componentKey`
- [ ] Publish → draft and published rows share the same `componentKey`, different `id`
- [ ] Load published → update with `{ componentKey, …fields }` updates the draft instance
- [ ] Omit-id array replace still works
- [ ] Invalid / foreign `componentKey` → 400
- [ ] Nested components + dynamic zones covered
