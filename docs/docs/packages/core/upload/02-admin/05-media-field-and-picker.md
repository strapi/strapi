---
title: Media field and picker
description: 'How the Content Manager media field stores, uploads and edits assets, and how the asset picker serves the field and the rich text editors.'
tags:
  - frontend
---

# Media field and picker

Two Media Library surfaces live inside other parts of the admin. [`index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/index.ts) registers both:

- `MediaLibraryInput`, in [`components/MediaLibraryInput/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/components/MediaLibraryInput), is the input of the `media` field type, registered with `app.addFields({ type: 'media' })`. The Content Manager edit view renders it.
- `MediaLibraryPickerDialog`, in [`components/AssetPickerDialog/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/components/AssetPickerDialog), is the `media-library` component, registered with `app.addComponents`. The Wysiwyg and Blocks editors render it to insert assets.

Both browse the library with `AssetPickerDialog`. They replace `legacy/components/MediaLibraryInput/` and `legacy/components/MediaLibraryDialog/`. The `useLegacyMediaLibrary` flag selects which pair is registered, see [Overview](./00-overview.md).

## The media field

### Props and value

`MediaLibraryInputProps` declares `name`, `label`, `labelAction`, `hint`, `required`, `disabled`, `attribute`, whose `allowedTypes` and `multiple` shape the field, and `layoutSize`. The `InputRenderer.tsx` of the Content Manager passes `layoutSize`, the width of the field in the edit layout, out of 12. The legacy input takes the same props without `layoutSize`.

The value comes from `useField<File | File[] | null>(name)`. It holds whole file objects. The input reads it as an array and writes it back with `setAssets`: a multiple field stores an array, or `null` when it is empty, and a single field stores the first file, or `null`. Write every change through `setAssets`, so the stored shape stays the same. The field itself never reorders its assets. The order changes only in the picker, see [Reordering](#reordering).

### What the field renders

- **Empty**, with no asset and no upload row, failed rows included: an `AssetDropZone` of variant `bar`.
- **Single field**: an `AssetRow` with a thumbnail, the name, and buttons to copy the link, edit and remove. While an upload of the field is in progress or failed, `UploadRow` takes its place until the upload lands or the user removes it. There is no drop zone once the field holds an asset. The user replaces it through the add menu.
- **Multiple field**: an `AssetCarousel` with one `AssetCard` per asset, one `UploadCard` per upload, and a drop tile. `getRowLayout` sets the number of cards from `layoutSize`: one card stacked over the drop zone at 4 or less, one card beside the tile below 12, two cards at 12. On mobile it shows one card, and below the `small` breakpoint the drop zone goes under it. The measured width of the row can only lower the count. Arrows page through the cards. When the number of cards grows, the row pages to the end, so a new upload is in view.

`AssetPreview` uses the `thumbnail` format in a row and the `small` format in a card. It appends `updatedAt` to the URL, so a replaced asset does not show its old image. It skips this on signed URLs (`isUrlSigned`), where an extra parameter breaks the signature. `UploadPreview` shows an image that is still uploading through an object URL of the local file.

The design system paints a disabled button as a bordered grey plate. [`FieldControls.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/MediaLibraryInput/FieldControls.tsx) holds `GhostIconButton` and `FieldMenuItem`, which keep disabled controls as grey icons and labels. When the field is disabled, edit, remove, retry, the add menu and the drop zone are disabled. Copy link and cancel upload stay enabled.

### Permissions

The field reads its flags from `useMediaLibraryPermissions`:

- **Browse library** needs read access. **Upload from device** and **Upload from URL** need `canCreate`. The add menu hides each entry without its permission, and hides itself when no entry is left.
- While the permissions load, every entry shows, disabled, so the menu does not change size when they settle. Drops and device uploads also wait: `canUpload` is `!isLoading && canCreate`, and the drop zone is disabled otherwise.
- Edit needs read access, because the drawer fetches the asset with `useGetAssetQuery`. Without it, the row and the card render no edit control.

### The add menu and the drop zone

`AddAssetMenu` sits on the label row with three entries:

- **Browse library** opens `AssetPickerDialog` with the assets of the field as the initial selection. On confirm, `handleSelect` writes the selection to the field.
- **Upload from device** clicks a hidden `<input type="file">` whose `multiple` attribute follows the field. `handleFileInputChange` copies `event.target.files` before it resets `value`, because the `FileList` is live and the reset empties it. The reset lets the user pick the same file twice in a row.
- **Upload from URL** opens `ImportFromUrlDialog` from `pages/Assets/components/`.

`AssetDropZone` only takes drops. A click on it does nothing. It counts `dragenter` and `dragleave` pairs, because drag events also fire on its children and a boolean would flicker. A drag that carries no files does not highlight it. Each media field renders its own zone, so the field does not use the page's `UploadDropZoneProvider`.

### Files coming in

`handleUpload` (drops and device files) and `handleUrlUpload` apply these rules:

- A single field refuses a batch of more than one file or URL, and uploads nothing. The count is taken before type filtering, so the field never keeps one file of several without saying which. The device input cannot produce such a batch, so the rule applies to drops and URLs.
- `filterAllowedFiles` from [`utils/allowedMediaTypes.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/utils/allowedMediaTypes.ts) drops the files outside `allowedTypes`. When none is left, a notification names the accepted types. When some are left, they upload and the same notification shows.
- For URLs, the server fetches the files, so their type is known only after the upload. Files outside `allowedTypes` stay in the library and are left off the field, and a warning names them. A single field takes the first accepted file. Request errors show in the upload progress dialog.
- Uploads go to the root of the library: `UPLOAD_FOLDER_ID` is `null`, because an entry form has no current folder.

### Uploads started from the field

`startUpload` calls `uploadFiles` (see [Uploads](./04-uploads.md)) with the `concurrentUploadRequests` setting as `concurrency` (1 while the settings are unknown), and with two field-specific arguments:

- `owner: name` tags the rows of the field in the progress store. [`useFieldUploads.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/MediaLibraryInput/useFieldUploads.ts) reads the rows of its owner, so the field and the progress dialog show the same state. The store only holds the latest batch, and closing the dialog empties it, so the hook remembers each row once seen. A failed upload stays on the field until the user retries or removes it. A row that leaves the store while in flight is treated as cancelled and disappears from the field, but its request is not aborted: the file still uploads, and `onFileUploaded` still attaches it. A completed row leaves the list.
- `onFileUploaded: attachUploadedFile` puts each file on the field as it lands. The upload service stores the callback with each file of the batch, so it also runs for a retry in place.

Retry works in place with `retryUploadFile` while the store still holds the row. After that, the field starts a new upload of the source file, if `getUploadSourceFile` still has it. The retry button only shows when one of the two is possible. URL imports pass no `owner`, so they show no row on the field.

`attachUploadedFile` runs when an upload ends, which can be after the input unmounted. It never relies on the value of a render:

- It reads the current value with `getValues` from `useForm` and writes with the `onChange` of the field. Both belong to the form, not to the input.
- `Form.tsx` updates the ref behind `getValues` during render, so `getValues` returns a new value only after the form renders. Two files can land before that. `unrenderedWrites`, a module-level `WeakMap` keyed by `getValues` and then by field name, keeps the last write and the value it was based on, so the second file does not overwrite the first.
- A multiple field appends the file. A single field replaces its asset.

`handleAssetChange`, `handleAssetDelete` and `handleUrlUpload` also resume after a request. They read `assetsRef`, the value of the latest render, instead of the `assets` of the render that started them.

### Editing an asset

The edit control opens `AssetDetailsDrawer`, described in [Asset details drawer](./02-asset-details-drawer.md). The open asset is local state, `editedAssetId`. `handleAssetChange` puts the server's copy of a changed asset on the field, and `handleAssetDelete` removes a deleted asset. A crop saved as a copy leaves the field as it is, because the original asset did not change.

Only one media field at a time can have its drawer open. [`openAssetDetails.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/MediaLibraryInput/openAssetDetails.ts) keeps a module-level set of the fields with an open drawer. `handleEdit` and the add menu (`preventOpen`) do nothing while the set is not empty, because the press that would open them is the press that closes the other drawer. See [One drawer across media fields](./02-asset-details-drawer.md#one-drawer-across-media-fields).

### Tracking location

The field tags its events with `location: 'content-manager'` (`CONTENT_MANAGER_LOCATION`): `didSelectFile`, `willAddMediaLibraryAssets`, and the drawer events through the `trackedLocation` prop. The Media Library page uses `MEDIA_LIBRARY_LOCATION` (`'upload'`) from `hooks/useTracking.ts`. The value tells events of the field apart from events of the page, so set it on every new event of the field.

The list controls that the picker reuses (`AssetsSearchInput`, `FilterMenu`, `SortMenu`) hard-code `MEDIA_LIBRARY_LOCATION`. Search, filter and sort events from the picker therefore report `'upload'`. The legacy picker reported `'content-manager'` for them.

## The picker dialog

[`AssetPickerDialog.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/AssetPickerDialog/AssetPickerDialog.tsx) takes `open`, `onClose`, `title`, `initialSelection`, `multiple` (false by default), `allowedTypes` and `onConfirm`. `onConfirm` receives the selection as an array, in order, even for a single field. The dialog has two tabs, **Browse assets** and **Selected assets** with a count, and always opens on Browse.

### How it reuses the Media Library list

The providers sit inside the modal content, and both hosts mount the dialog only while it is open, so each opening starts with a fresh list and selection. From the outside in:

1. `ReadAccessGate`: without read access, it shows `Page.NoPermissions` and mounts nothing that fetches.
2. `ListQueryStateProvider`: keeps the list query in memory, see the next section.
3. `ListSettingsProvider`: `showItemActions: false` removes the context menu and the bulk actions bar, because the picker is for choosing assets, not for moving or deleting them. It also sets a narrower `gridMinTileWidth` and turns on the section headings and the grid select-all.
4. `PickerSelectionRoot`: calls `useAssetsList()` once and shares the result through `AssetsListContext`. `PickerSelectionProvider` needs the loaded assets to resolve a picked key to a file, and the Browse tab renders them.

The Browse tab renders the toolbar parts of the page and `AssetsView`. It passes `onAssetItemClick={toggleAsset}`, so a plain click picks an asset instead of opening the drawer, and `canAddAssets={false}`, so the empty state offers no upload. The grid or table choice uses the same `localStorageKeys.view` key as the page.

### List state lives in memory

The picker opens over an entry edit view. If it wrote the folder, search, filters and sort to the URL, it would change the URL of the entry. `ListQueryStateProvider` keeps that query in React state instead, and every list hook reads it through [`useListQueryParams`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useListQueryParams.ts). The memory store parses and stringifies with `qs`, like the URL, so values that callers encode first read back the same. It ignores the `replace` argument, since memory has no history.

A new list hook must use `useListQueryParams`. A hook that calls `useQueryParams` directly writes to the entry URL when the picker renders it. [Asset list](./01-asset-list.md#list-state) describes the list state and its encoding rules.

### Selection rules

[`PickerSelectionProvider.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/AssetPickerDialog/PickerSelectionProvider.tsx) provides `AssetSelectionContext` with the same `AssetSelection` interface as the page (see [Asset list](./01-asset-list.md)), so `AssetsGrid` and `AssetsTable` work unchanged. The rules:

- The selection is the value the field will hold: whole `File` objects, in order ([`pickerSelection.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/AssetPickerDialog/pickerSelection.ts)). It starts with what the field holds, and new picks are appended in click order. A picked key is resolved against the loaded assets and the current selection.
- Only assets take part. A folder key is `hidden`, so folders show no checkbox.
- An asset outside `allowedTypes` is `disabled`, unless it is already selected. An asset the field already holds stays removable, for example after the schema was narrowed.
- In a single field, a new pick replaces the selection, and select-all is off (`canSelectAll` is `multiple`). Shift+click (`selectRange`) toggles only the target.
- Nothing in the picker clears the selection, so it survives folder changes, search, filters and sort.
- **Confirm** is disabled while the selection has the same ids in the same order as `initialSelection` (`isSameSelection`). Confirming an empty selection clears the field.

Two helpers implement `allowedTypes`. The picker uses `isAllowedAssetType` from `utils/isAllowedAssetType.ts`, and the field checks incoming files with `isMediaTypeAllowed` from `utils/allowedMediaTypes.ts`. Both read the MIME family before the `/`, treat `files` as everything that is not an image, a video or an audio file, and allow everything when `allowedTypes` is empty. They differ on a file with no MIME type: `isMediaTypeAllowed` accepts it where `files` is allowed, `isAllowedAssetType` rejects it. Change both together.

### Reordering

Reordering happens only on the Selected tab, which is always a grid. The order on this tab is the order the field will hold. [`SortableSelection.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/AssetPickerDialog/SortableSelection.tsx) wraps `AssetsGrid` in a dnd-kit `DndContext` and provides `usePickerSortableAsset` through `AssetSortableContext`.

- A pointer drag starts anywhere on the item after 8px of travel, so a click still picks or unpicks it. The keyboard starts a drag from the grip.
- The pointer release that ends a drag also fires a click, which would unpick the item. `swallowNextClick` swallows that click after a drop, and after a pointer drag cancelled with Escape.
- Radix listens for Escape on the document in the capture phase, so it would close the dialog during a drag. `onReorderingChange` sets `isReorderingRef` in the dialog, and `onEscapeKeyDown` keeps the dialog open while it is set.

### Folder breadcrumbs

[`FolderBreadcrumbs.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/AssetPickerDialog/FolderBreadcrumbs.tsx) shows Home, the ancestors and the current folder, from `useFolderTrail`. The mobile folder header of the page reads the same hook (see [Asset list](./01-asset-list.md#folder-tree)). It renders in the fixed header above the scrolling list, only inside a folder, and not while the search covers all media, because those results are not in the folder. Past three folders, the middle ones collapse into a `CrumbSimpleMenu`. The crumbs are `<button>` elements: the design system `CrumbLink` renders an anchor, and an anchor without `href` is not a button and not reachable with Tab. When the tree does not hold the folder, the trail renders nothing, and `useAssetsList` sends the list back to the root once the folder request returns a `NotFoundError`.

## The editors' contract

[`MediaLibraryPickerDialog.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/AssetPickerDialog/MediaLibraryPickerDialog.tsx) adapts the `media-library` props to `AssetPickerDialog`. Its props have the same names as `MediaLibraryDialogProps` of the legacy dialog: `allowedTypes`, `multiple` (true by default), `initiallySelectedAssets`, `onClose` and `onSelectAssets`. The title is a generic "Add assets", because the editors pass no field label.

- The host opens the dialog by mounting it and closes it by unmounting it. The component always renders its modal open.
- Cancel and Escape call `onClose`.
- Confirm calls `onSelectAssets` with an array of files and does not call `onClose`. The host closes the dialog itself.

The flag swaps the legacy dialog in under the same callers, so keep this contract compatible with it. The callers in `@strapi/content-manager` read the component with `useStrapiApp('ImageDialog', (state) => state.components)`:

- [`Wysiwyg/Field.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/content-manager/admin/src/pages/EditView/components/FormInputs/Wysiwyg/Field.tsx) passes only `onClose` and `onSelectAssets`, so the picker allows several assets of any type. `insertFile` in `Wysiwyg/utils/utils.ts` writes `![alt](url)` for an image and `[alt](url)` for another file. The alt text falls back to the file name, and the URL gets the backend URL prefix. Then the field hides the dialog.
- `ImageDialog` in [`BlocksInput/Blocks/Image.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/content-manager/admin/src/pages/EditView/components/FormInputs/BlocksInput/Blocks/Image.tsx) passes `allowedTypes={['images']}`. `toBlockImage` keeps the fields of the image schema, falls back to the name for the alt text and prefixes the URL. The images go relative to where the caret was when the dialog opened: they replace that block when it is empty, and go below its top-level block otherwise. A Slate `RangeRef` keeps that position, because the editor can lose its selection while the dialog is open.

Neither caller passes `initiallySelectedAssets`, so **Confirm** stays disabled until the user picks an asset.

## Related

- [Overview](./00-overview.md): the `useLegacyMediaLibrary` switch and the legacy tree.
- [Asset list](./01-asset-list.md): list state, search and selection on the page.
- [Asset details drawer](./02-asset-details-drawer.md): the drawer that the field opens.
- [Uploads](./04-uploads.md): the upload pipeline and the progress store.
- [Data fetching](./07-data-fetching.md): the endpoints behind the list and the uploads.
- [Testing](./08-testing.md): unit tests, and the `MediaField.ts` page object for the field.
