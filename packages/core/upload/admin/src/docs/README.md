# Media Library — Contributor Docs

Internal docs for the Strapi v5 media library. Lives at
`packages/core/upload/admin/src/` and is the default Media Library since 5.54,
mounted under `/admin/plugins/upload`. Setting `useLegacyMediaLibrary: true`
serves the pre-revamp page from `src/legacy/` instead.

These docs are not published. They exist so the next person (or Claude
session) shipping a feature here doesn't relearn the same lessons.

## Index

- [architecture.md](architecture.md) — layout, env gate, where to add code
- [drawer.md](drawer.md) — z-index ladder, in-drawer toast, history, discard guard
- [forms.md](forms.md) — Form children-as-function, dirty state, save gating
- [rtk-query.md](rtk-query.md) — tag types, LIST convention, invalidation
- [testing.md](testing.md) — msw v2, page objects, e2e gating
- [branching.md](branching.md) — commits, branches, PR conventions
- [gotchas.md](gotchas.md) — File collision, stale msw, strict-mode locator pitfalls

## Quick start for a new feature

Use the `/feature-ml` skill (user-level). It walks plan → branch → code →
test → PR with a checkpoint before any code is written.

Before coding, read the docs that apply:

| Doing this               | Read                                          |
| ------------------------ | --------------------------------------------- |
| Editing the asset drawer | `drawer.md`, `forms.md`                       |
| Adding an endpoint       | `rtk-query.md`, `gotchas.md` (File collision) |
| Writing tests            | `testing.md`                                  |
| Opening a PR             | `branching.md`                                |
