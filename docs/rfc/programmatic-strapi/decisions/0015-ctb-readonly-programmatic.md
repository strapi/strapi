# ADR-0015: Programmatic content types are read-only in the Content-Type Builder

**Status:** Accepted (Phase 2)

## Context

The Content-Type Builder (CTB) edits content types by **writing `schema.json`** to a path
resolved from `strapi.dirs.app.api/<apiName>/content-types/<singularName>/schema.json`
(`createBuilder` in `schema-builder/index.ts`, flushed by `writeFiles()`). A **programmatic**
content type is defined in code via `defineApp` and has **no `schema.json` on disk** — and
in programmatic mode the disk is never scanned (ADR-0001). Letting the CTB "edit" such a
type would silently scaffold a stray file the loader never reads, and the change would be
lost on the next boot.

The Phase 1 open question asked how CTB currently decides editability so the origin tag
**reuses** existing mechanics rather than inventing new ones.

## Decision

Tag each programmatic content type with its **origin** and gate CTB writes on it:

1. The programmatic normalizer stamps
   `pluginOptions['content-type-builder'].origin = 'programmatic'` — the **same**
   plugin-options bag the CTB already uses for `visible` (`isContentTypeVisible`). File-based
   content types carry no such tag.
2. CTB exposes `getContentTypeOrigin` / `isContentTypeEditable`, and `formatContentType`
   returns an **`editable`** flag to the admin (so the UI can present the type as read-only).
3. The `updateContentType` and `deleteContentType` controllers **reject** programmatic
   content types with `contentType.programmatic.readonly` (HTTP 400) before any file write.

No new schema field and no new UID→path machinery is introduced; the tag rides in the
existing `pluginOptions['content-type-builder']` object.

## Consequences

- Programmatic content types are listed and visible in the CTB but cannot be edited or
  deleted; the source of truth stays the `defineApp` definition.
- File-based content types are unaffected (no origin tag ⇒ editable), so legacy behavior is
  unchanged (ADR-0002).
- The `editable` flag is additive in `formatContentType`; existing consumers ignore it.

## Alternatives considered

- **Allow edits and write `schema.json` to a generated dir.** Rejected: contradicts the
  "definition is the source of truth" model (ADR-0001); the write would be ignored on
  reboot and confuse users.
- **Hide programmatic types from the CTB entirely (`visible: false`).** Rejected: users
  still want to _see_ their content model in the builder; read-only is the right affordance.
