# Architecture

## Scope

This tree is the media library admin UI (the former `future/` rewrite, default since 5.54).
The legacy implementation (`pages/Assets`, `pages/Folders`, plus the
companion services) is frozen except for bug fixes — all new work happens
here.

This is the default Media Library since 5.54, mounted at
`/admin/plugins/upload`. `useLegacyMediaLibrary: true` registers the
pre-revamp page from `src/legacy/` instead — the two are mutually
exclusive, so only one Media Library is ever in the menu.

## Layout

```
src/
├── App.tsx                # Routes for the Media Library page
├── components/            # Cross-cutting shell: Drawer, Layout, NavBar, Sidebar
├── pages/
│   └── Assets/
│       ├── components/    # Feature components (AssetDetails, ListView, GridView, ...)
│       └── hooks/         # URL-param hooks (useAssetDetailsParam, ...)
├── services/              # RTK Query slices (assets, folders, settings, api)
├── store/                 # Local UI store
├── utils/
├── pages/SettingsPage/    # Global Settings → Media Library; ships in both modes, stays
└── legacy/                # pre-revamp stack: old ML page + Content Manager media field picker
                           # shrinks as things are rewritten; not deletable wholesale
```

## Where to add code

- **New endpoint**: inject into `services/<resource>.ts` against `uploadApi`
  (see [rtk-query.md](rtk-query.md)). Don't create a parallel
  `createApi(...)` — everything shares the same cache.
- **New feature component**: lives under
  `pages/Assets/components/<Feature>/`. Co-locate unit tests under
  `<Feature>/tests/`.
- **New shell-level component** (used across pages): under
  `components/`.
- **New URL param hook**: under `pages/Assets/hooks/` and follows the
  `setQuery(params, 'push', true)` pattern (see [drawer.md](drawer.md)).
- **Translations**: keys live in
  `packages/core/upload/admin/src/translations/en.json` (and siblings).
  Keep them flat and feature-scoped: `asset-details.<action>.<variant>`.
