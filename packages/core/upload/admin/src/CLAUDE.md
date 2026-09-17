# Media Library (admin)

This directory **is** the Media Library page. It was the `future/` rewrite and
became the default in 5.54 (`useLegacyMediaLibrary` opts back out).

- `legacy/` — the pre-revamp stack. Holds the old Media Library page **and** the
  media field picker (`MediaLibraryDialog`, `MediaLibraryInput`) used by Content
  Manager. The picker still ships in the default configuration, so `legacy/`
  means "not yet rewritten", **not** "dead code".

  It shrinks as things are rewritten, but it is **not** deletable wholesale.
  Two surfaces that ship by default still depend on it: the picker (~109 files)
  and `pages/SettingsPage` (42 files, via `legacy/hooks` and `legacy/utils`).
  Removing the `useLegacyMediaLibrary` flag deletes `legacy/pages/App/` and
  `ConfigureTheView` — the rest stays until the picker and the settings page own
  their dependencies.

- `pages/SettingsPage/` — Global Settings → Media Library. Registered
  unconditionally, unchanged by the revamp, and expected to stay. It lives here
  rather than in `legacy/` so it does not get swept up when the legacy tree
  goes, even though its imports still reach into `legacy/`.
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
