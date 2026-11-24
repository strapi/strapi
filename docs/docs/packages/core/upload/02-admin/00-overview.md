---
title: Media Library admin
sidebar_label: Overview
description: 'Layout of the Media Library admin code, the switch to the legacy Media Library, and where new code goes.'
tags:
  - frontend
---

# Media Library admin

The admin part of `@strapi/upload` lives in [`packages/core/upload/admin/src`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src). It contains the Media Library page, the `media` field input of the Content Manager, and the picker that the rich text editors use to insert images.

## One switch, two implementations

[`index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/index.ts) registers the admin part. It reads the `useLegacyMediaLibrary` feature flag once, and registers one of two implementations for each surface:

| Surface                                                           | Default                                                     | `useLegacyMediaLibrary: true`           |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| Media Library page (menu link to `plugins/upload`)                | `App.tsx`, which renders `pages/Assets/AssetsPage.tsx`      | `legacy/pages/App/App.tsx`              |
| `media` field input                                               | `components/MediaLibraryInput/`                             | `legacy/components/MediaLibraryInput/`  |
| `media-library` component, used by the Wysiwyg and Blocks editors | `components/AssetPickerDialog/MediaLibraryPickerDialog.tsx` | `legacy/components/MediaLibraryDialog/` |
| Upload progress dialog and Blocks editor file drop zone           | Registered                                                  | Not registered                          |

Only one implementation is registered, so the menu has a single Media Library entry. The settings page in `pages/SettingsPage/` is registered in both modes. An application sets the flag in `config/features`.

## Layout

```
admin/src/
├── index.ts          # Registers the admin part and applies the legacy switch
├── App.tsx           # Routes of the Media Library page
├── components/       # UI shared by the page and the field: Drawer, upload progress
│                     # dialog, media field input, picker dialog
├── hooks/            # Hooks shared by the page and the field: permissions, tracking
├── pages/
│   ├── Assets/       # The Media Library page: grid, table, folder tree, asset details
│   └── SettingsPage/ # Settings > Media Library, registered in both modes
├── services/         # RTK Query endpoints
├── store/            # Redux slice for upload progress
├── translations/
├── types/
├── utils/
└── legacy/           # The previous implementation
```

## What `legacy/` holds

`legacy/` is the previous Media Library. The application runs it only when `useLegacyMediaLibrary` is true. Some files outside `legacy/` still import from it:

- `index.ts` imports the legacy field input and dialog to register them when the flag is on. It also imports `legacy/utils/prefixPluginTranslations` in both modes.
- `pages/SettingsPage/SettingsPage.tsx` imports `legacy/hooks/useSettings` and `legacy/hooks/useAIMetadataAvailability`.
- `admin/tests/setup.ts` mocks `legacy/hooks/useTracking` and `legacy/hooks/useSettings` for every unit test.

Put new work in the current tree, not in `legacy/`. Before you remove a file from `legacy/`, check that none of the imports above still need it.

## Where new code goes

- **A component for one feature of the page**: `pages/Assets/components/<Feature>/`.
- **A component that the page and the field share**: `components/`. For example, the field reuses the asset details drawer and the shared `Drawer` shell.
- **A hook**: `hooks/` when the page and the field share it, `pages/Assets/hooks/` when only the page uses it.
- **An endpoint**: a file in `services/`. See [Data fetching](./03-data-fetching.md).
- **Tests**: a `tests/` folder next to the code. See [Testing](./04-testing.md).
- **Translations**: `translations/en.json`. Keys are flat and scoped by feature, for example `asset-details.replace.success`. Read them with `getTranslationKey` from `utils/translations.ts`, which adds the `upload.` prefix.

## Layout pitfall: the global image reset

The design system's global style sets `max-width: 100%` on `img`. This reset clamps any explicit image size that is wider than the container. The crop editor (`pages/Assets/components/AssetDetails/AssetCropEditor.tsx`) sizes a rotated image beyond its container, so it applies that size as an inline style with `maxWidth: 'none'`. Check the computed width in a browser when you size an image explicitly.

## Pages in this section

- [Asset details drawer](./01-asset-details-drawer.md): the drawer shell, stacking, URL state, unsaved edits and in-drawer feedback.
- [Forms](./02-forms.md): reading form state, the save baseline and save gating.
- [Data fetching](./03-data-fetching.md): the API slice, cache tags, endpoint names and uploads.
- [Testing](./04-testing.md): unit tests, the two end-to-end suites, and what jsdom cannot catch.
