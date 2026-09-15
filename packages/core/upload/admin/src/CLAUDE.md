# Media Library (admin)

This directory **is** the Media Library page. It was the `future/` rewrite and
became the default in 5.54 (`useLegacyMediaLibrary` opts back out).

- `legacy/` — the pre-revamp stack. Holds the old Media Library page **and** the
  media field picker (`MediaLibraryDialog`, `MediaLibraryInput`) used by Content
  Manager. The picker still ships in the default configuration, so `legacy/`
  means "not yet rewritten", **not** "dead code". It shrinks as things move out
  of it, and gets deleted when it is empty.
- `constants.ts`, `enums.ts`, `pluginId.ts`, `translations/`, `utils/typeFromMime.ts`
  are shared by both trees and stay at the root.

Conventions and gotchas live in [`docs/`](./docs/README.md) — read the
relevant page before non-trivial changes:

- Drawer changes → [`docs/drawer.md`](./docs/drawer.md) (z-index, toasts, history)
- Form changes → [`docs/forms.md`](./docs/forms.md)
- New endpoint → [`docs/rtk-query.md`](./docs/rtk-query.md) + [`docs/gotchas.md`](./docs/gotchas.md)
- Tests → [`docs/testing.md`](./docs/testing.md)
- PR / branch → [`docs/branching.md`](./docs/branching.md)

For full feature workflow, use the user-level `/feature-ml` skill.
