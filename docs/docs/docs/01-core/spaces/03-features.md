---
title: Feature coverage
tags:
  - spaces
  - multi-tenancy
---

# Feature coverage

Most of Strapi needs nothing from the Spaces plugin. Once a model carries a
space, the query scope narrows it wherever it is read — including through
relations, and including from code that was written before Spaces existed.

What follows is what each feature does, and where something extra was needed.

## Space-aware

| Feature                   | How                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Content Manager           | The model carries a space; lists, reads and writes are narrowed. The all-spaces view adds a **Space** column                      |
| Media Library             | Files and folders carry a space                                                                                                   |
| Relations                 | Narrowed on read; a write that would link across spaces is refused with an error rather than leaving a dangling link              |
| i18n                      | Locales stay global; a localised entry's rows each carry the space                                                                |
| Releases                  | Releases and their actions carry a space. A publish runs in the release's own space, including a scheduled one firing days later  |
| Review Workflows          | Workflows and stages carry a space                                                                                                |
| Content History           | Versions carry a space, and one with none is platform-only                                                                        |
| Audit logs                | Entries carry the space they happened in; a platform event is not shown to a tenant                                               |
| Webhooks                  | A webhook belongs to the space it was created in; delivery skips events from other spaces. An unbound webhook stays platform-wide |
| API tokens                | Bound to the space they were issued in                                                                                            |
| REST and GraphQL          | Both resolve through the document service and the query scope, so both are narrowed                                               |
| Content-type availability | A space can be limited to some content types; reaching another is refused rather than answered with an empty list                 |

## Platform-only, on purpose

These stay outside tenancy, and are reachable only by someone who administers
the project:

- **Content-Type Builder** — one schema, shared by every space.
- **Admin users and roles** — identities belong to the project, not to a space.
- **Data transfer, import and export** — they move whole datasets, and a scoped
  transfer needs a design of its own.
- **Users & Permissions** — application users are a separate identity system;
  the content _they_ read is still narrowed by the request's space.

## Not in this version

Deliberately left out, each because it changes something more fundamental than a
row filter:

- **Moving an entry between spaces.** Needs authority at both ends, and has to
  answer what happens to the entry's relations, unique values, releases and
  history.
- **Per-space overrides of shared content.** The experiment this work follows
  did this by copying an entry while keeping its document id, which makes
  identity `(documentId, spaceId)` and touches relations, publishing, history
  and exports. If it is needed, it needs to become a core concept rather than a
  plugin rewriting ids.
- **Sharing with _selected_ spaces.** Today sharing is all-or-nothing: a row
  belongs to one space, or to none and is readable by all.
- **Space administrators creating their own roles.** Delegating role creation
  means proving a new role grants no more than its author may delegate, which
  conditions like "entries created by me" make genuinely hard.

## Adding a space to a new model

Opt in or out per content type:

```json
{
  "pluginOptions": {
    "spaces": { "scoped": false }
  }
}
```

The defaults: a project's own content types (`api::*`) are scoped, because a
project's content is what tenancy is about. Plugin-owned models are not, unless
they are listed in `ALWAYS_SCOPED_UIDS` — a plugin's data is usually
configuration. The platform's own records are never scoped, whatever a schema
says.

The column is created by schema sync, so no migration is written by hand.

## Turning Spaces off

The schema is registered whether or not the licence carries the feature. Schema
sync removes columns it is not told about, so gating registration would drop the
`space` column from every content type on the next boot — and with it any record
of which tenant owned what. Merging every tenant's data together is not
something a licence check should be able to do, so the columns stay and only the
enforcement is switched off.

Going back to Community Edition properly is a migration, not a flag: two spaces
may each hold a homepage, or an `about-us` slug, and with the filter gone those
collide.
