---
title: Asset list
description: 'How the Media Library page lists folders and assets: list state, search scope, filters, sort, infinite loading, selection and the folder tree.'
tags:
  - frontend
---

# Asset list

The Media Library page lists the folders and assets of one folder, or the results of a search. The code is in [`pages/Assets/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/pages/Assets). [`AssetsPage.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/AssetsPage.tsx) composes the page. [`hooks/useAssetsList.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useAssetsList.ts) reads the list state and runs the folder and asset queries. The Content Manager picker reuses `useAssetsList` and the views (see [Media field and picker](./05-media-field-and-picker.md)), so a change here affects both surfaces.

## How the page is composed

```
UploadDropZoneProvider          disabled without assets.create
└─ AssetSelectionProvider       disabled without assets.update
   └─ BusyAssetsProvider
      └─ AssetsDndProvider
         ├─ ClearSelectionOnChange
         └─ Layouts.Root
            ├─ sideNav: FolderTree, with a MainAreaContextMenu for its background
            └─ Page.Main
               ├─ MainAreaContextMenu
               ├─ StickyHeader: title, "New" menu, toolbar, FilterBadges
               └─ Layouts.Content: page subscribers, drop zone, AssetsView
FolderFormDialog, ImportFromUrlDialog, AssetDetailsDrawerFromUrl
```

- The toolbar holds `FilterMenu`, `AssetsSearchInput`, `SearchScopeControls` (only while searching), `SortMenu` and `ViewToggle`.
- The view (grid or table) is not list state. `usePersistentState` stores it in `localStorage` under `STRAPI_UPLOAD_LIBRARY_VIEW`.
- `AssetsView` renders a loader, an error, an empty state, or the list. The list is `AssetsGrid` or `AssetsTable`, followed by the infinite scroll sentinel and the `BulkActionsBar`. With no folder and no asset, a search shows `EmptyState` with "Clear search". Filters without a search show `FilteredEmptyState` with "Clear filters".
- `useListSettings` lets a host turn off the item affordances. Without a provider it returns the page defaults, with the context menus and the bulk actions bar on. The picker turns them off.

## List state

| Parameter   | Hook                  | Value                                         | History entry |
| ----------- | --------------------- | --------------------------------------------- | ------------- |
| `folder`    | `useFolderNavigation` | Folder id. Absent at the root.                | Added         |
| `_q`        | `useAssetSearch`      | The encoded search term                       | Replaced      |
| `searchAll` | `useAssetSearch`      | `true`, or absent                             | Replaced      |
| `filters`   | `useListFilters`      | Serialized filter badges                      | Replaced      |
| `sort`      | `useListSort`         | One sort rule. Absent means `updatedAt:DESC`. | Added         |
| `folders`   | `useListSort`         | `mixed`, or absent for folders on top         | Added         |

Back returns to the previous folder or sort. Filters replace the entry because they change in small steps, such as each checkbox of the Type submenu, and one change must not become a stack of Back entries.

Every list hook reads and writes through [`useListQueryParams`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useListQueryParams.ts), never through `useQueryParams` directly. Without a `ListQueryStateProvider`, it returns `useQueryParams` from `@strapi/admin`, so the page keeps its state in the URL. A link reproduces the list, and a refresh restores it. `AssetPickerDialog` wraps its content in `ListQueryStateProvider`, which keeps the query string in React state, because the picker opens on a Content Manager page and a URL write would change the URL of the entry. The provider ignores the `replace` argument. Add new list state through `useListQueryParams`, or the picker writes it to the URL of the entry. The drawer's `assetId` exists only on the page and uses `useQueryParams` directly.

Two guards keep `folder` valid. `useFolderNavigation` strips a value that does not parse as a number. `useAssetsList` navigates to the root when `getFolder` fails with a `NotFoundError`, for example after the folder was deleted. Opening a folder clears `_q` and `searchAll` inside `useFolderNavigation`, so no caller can forget it.

### Encoding `_q` and `filters`

`setQuery` from [`useQueryParams`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/hooks/useQueryParams.ts) merges the current query, which `qs.parse` has decoded, and writes the result with `encode: false`. The in-memory provider does the same round trip. Three rules follow:

- Encode the term when you write it. `useAssetSearch` writes `encodeSearchQuery(value)` from [`utils/searchQueryParam.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/utils/searchQueryParam.ts).
- A write that keeps the current `_q` must go through `withEncodedUserParams(query, nextParams)` from `@strapi/admin`. It encodes the current `filters` and `_q` again. Without it, a `&` in the decoded term splits it into two parameters. `useListSort`, `useListFilters` and the folder strip do this. Folder navigation does not, which is safe only because it removes `_q` and the filter grammar has no character that needs encoding.
- The services encode the term once more for the request (`services/assets.ts`, `services/folders.ts`), because `getFetchClient` also stringifies params with `encode: false`.

## Search

`AssetsSearchInput` owns the typed value and a 300 ms debounce. `useAssetSearch` only reads and writes `_q` and `searchAll`, so every consumer reads the same value. The input copies `_q` back when it changes from elsewhere, such as Back or "Clear search". When `folder` changes, the input drops a term that the debounce has not committed yet, or it would start a search in the new folder. Clearing the term also removes `searchAll`.

The scope depends on the folder:

- At the root, a search covers the whole library, and there is no switch.
- In a folder, a search covers the folder and its subfolders. `SearchScopeControls` shows the "Search all media" switch, which sets `searchAll=true`. `FolderTree` then stops highlighting the open folder.
- A folder search needs the `path` of the folder, from `getFolder`. `useAssetsList` passes it as `searchFolderPath`. Until it arrives, both queries are skipped and the list reports loading, because without it the search would run on the whole library. If `getFolder` fails, its error becomes the list error.

While searching, the services replace the direct-children scope. Files match `folderPath` equal to the path or starting with `<path>/`. Folders match `path` starting with `<path>/`, so the open folder itself is not a result. The trailing slash keeps `/1` from matching `/12`. List filters apply in both modes. `getFolders` sends no `page` or `pageSize`, so it returns every match. `SearchScopeControls` shows the result count as the number of folders plus the asset `pagination.total`, and hides it while the list loads or fails.

## Filters and sort

`?filters=` holds badges separated by `;`. A badge is `<field>:<condition>:<value>`, for example `type:is:picture,audio`, `created:within:1week` or `created:rangeis:2024-01-01..2024-04-07`. `parseFiltersParam` in [`useListFilters.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useListFilters.ts) drops any badge it cannot parse, since users can edit the URL.

[`buildAssetFilters`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/utils/buildAssetFilters.ts) turns the badges into `filters[$and]` clauses:

- Badges combine with AND. Date badges apply to files and folders.
- Relative presets stay relative in the URL, so a shared link means "the last week" whenever it is opened. `useAssetsList` resolves them against `new Date()` in a `useMemo` keyed on `listFilters.serialized`. The query args and the RTK Query cache keys stay stable between renders. While the page stays mounted, the resolved dates change only when the filters change.
- `picture`, `audio` and `video` map to `mime` clauses. `document` means a mime that contains none of `image`, `audio` and `video`.
- `folder` is not a mime. It decides `showFolders`. An `is` badge with only `folder` sets `showFiles` to false, and the files query does not run.

`FilterMenu` adds badges, and `FilterBadges` edits them in place. The Type submenu stays open and edits the last type badge. Picking a date preset replaces the preset badge of that field. Only creation date offers a range in the UI, but the codec also accepts `updated:rangeis:`.

Range endpoints are `YYYY-MM-DD` calendar days in the user's timezone. Parse them with `parseCalendarDate`, never with `new Date(value)`: a date-only string parses as UTC midnight, which is the previous day west of UTC. `buildAssetFilters` sends the local start and end of day as ISO strings. `pages/Assets/tests/FilterBadges.timezone.test.tsx` runs in `America/Los_Angeles` through `@jest-environment-options`, because the global test setup pins `TZ=UTC`, where this bug cannot show (see [Testing](./08-testing.md)).

[`useListSort`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useListSort.ts) keeps one rule. The date group ("Oldest uploads", "Most recent updates") and the name and size group exclude each other. Clearing the active rule falls back to the default, which is written as no parameter. The folders query uses `foldersSort`: `name:ASC` by default, like the folder tree, and the explicit rule otherwise, except size rules, because folders have no size.

"Folders: Mixed with files" exists in the table only (`showFoldersGroup` on `SortMenu`). The grid always shows folders first. In mixed mode, `mergeMixedList` sorts the folders on the client with the asset rule and interleaves them with the loaded assets. A folder that sorts after the last loaded asset waits for a later page, and ties put folders first.

## Infinite loading

[`useInfiniteAssets`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useInfiniteAssets.ts) loads pages of 20 assets. It keeps one accumulator per `queryKey`, the JSON of the request args. Folders are not paginated.

- **Dedupe by id**: `flattenPages` joins the pages in order through a `Map` keyed by id. An asset that moved to another page after a mutation keeps its first position, shows its latest data, and renders once.
- **Page subscribers**: the hook subscribes only the latest page. The caller must render the returned `subscribers` node, which mounts one `PageSubscriber` per earlier page. Without it, an `{ type: 'Asset', id: 'LIST' }` invalidation refetches the latest page only (see [Data fetching](./07-data-fetching.md)). `AssetsPage` renders it in `Layouts.Content`.
- **Previous results stay on screen**: `listKey` ignores the search term. A new term keeps the previous rows until page 1 of the new query lands, so the list does not blank on each debounced commit. Meanwhile `hasNextPage` is false, because it reads only the live response. A change of folder, sort, filters or search scope changes `listKey`. The hook then returns no assets and reports loading, so old rows never show under a new header.
- **Remembered lists**: the last 10 lists (`MAX_REMEMBERED_LISTS`) keep their pages. Returning to one restores its rows at once, resumes at its deepest page, and refreshes in the background without a loader.
- **Cache eviction**: on a folder change, the hook removes the `getAssets` cache entries of the folder it leaves. It parses the args out of the `getAssets(...)` cache keys and dispatches the internal `removeQueryResult` action. Both are RTK Query internals, so recheck this code when you upgrade RTK Query. `pages/Assets/hooks/tests/useInfiniteAssets.eviction.test.ts` covers which entries it removes.
- **Uploads**: a finished upload is merged into the list only without a search or filters, and only in its own folder (`mergeUploadedAssets`, see [Uploads](./04-uploads.md)).

`AssetsView` renders a 1px sentinel after the list, with the callback ref of [`useInfiniteScrollSentinel`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useInfiniteScrollSentinel.ts). Only the observer callback requests a page, and only when `hasNextPage` is true and `isFetchingMore` is false, that is, no page after the first is in flight. A state change never does, so a stale reading from before the new rows rendered cannot fetch an extra page. When a page settles, the hook observes the sentinel again. That forces a fresh reading, so loading continues until the viewport is full. The observer options are read once, when the node attaches: pass a module-level object. `AssetsView` passes a `-1px` bottom root margin, so a sentinel that sits exactly at the fold does not count as visible and loads no page.

`useListScrollRestoration(listQueryKey)` saves the scroll offset of each list and restores it on return. It listens on the main column of `Layouts.Root`, the ancestor marked `data-strapi-main-content`. It keeps 10 offsets. When the key changes, a layout effect sets the saved offset, or the top for a new list. It retries on each commit for 2 seconds while the content is too short, then gives up so it does not move a list the user is reading.

## Selection and bulk actions

The views read selection through the [`AssetSelection`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/hooks/useAssetSelection.ts) interface. The page provides it with `AssetSelectionProvider`. `AssetSelectionContext` is exported so that the picker can feed the same views its own rules, such as `getSelectability` returning `disabled` for a type the field does not accept. The pure logic is in `utils/selection.ts`.

- Keys are `asset:<id>` and `folder:<id>`, because ids from the two tables can collide.
- A plain click opens the drawer or the folder. Shift+click selects the range from the anchor, Cmd or Ctrl+click toggles, Space toggles and Enter opens. The checkbox toggles, and Shift extends the range.
- `AssetsView` builds the rendered order once with `buildRenderedKeys`, from `mergeMixedList` in mixed mode. Range selection, select all and the bulk bar use it, so they agree on what is on screen. Select all covers the loaded items only.
- `ClearSelectionOnChange` clears the selection when `getListQueryKey` changes: folder, search term, search scope, sort, folder position or filters. Loading more and switching views keep it.
- On the page, `deselectAll` clears everything. The drawer does not deselect an asset it moves or deletes, so the selection can hold keys that left the list. The item menus deselect their item on success.
- Without `assets.update`, the provider is disabled: its mutators do nothing and the views hide the checkboxes.

`BulkActionsBar` renders only when something is selected and the user has `assets.update`. It offers select all, metadata generation when AI metadata is on, move, delete and clear. A successful action clears the selection. The bar is fixed, so it renders a spacer under the list, as tall as the space the bar covers. On mobile it hides while the drawer is open. Moves read the parent of each item from `itemLocations`, built from the loaded rows, because a search result can sit in any subfolder (see [Drag and drop](./06-drag-and-drop.md)).

## Context menus

- `ItemContextMenuProvider` wraps both views when item actions are on. A right-click on an item inside a multi-selection opens `SelectionContextMenu`. Any other right-click selects only that item and opens `AssetContextMenu` or `FolderContextMenu`. Each opening has its own React key, so dialog state never carries over to the next one.
- `MainAreaContextMenu` handles a right-click on the background of the main column. It offers the creation actions, led by the selection actions when items are selected. It ignores targets inside `[data-native-context-menu]`, `thead`, links, buttons and form fields. Cards, rows and the bulk bar carry `data-native-context-menu`. Add it to any new element of the list that must not open the creation menu. The sidebar instance offers creation only.

## Folder tree

[`FolderTree`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/pages/Assets/components/FolderTree) fetches the whole tree in one `getFolderStructure` request. It never writes the URL: it calls `onSelectFolder`, which the page wires to `navigateToFolderId`. Expansion is local state, and the ancestors of the open folder expand by themselves. When the open folder is at depth 4 or deeper (`COLLAPSE_FROM_DEPTH` in `collapsedBranch.ts`), the folders between the root of the branch and the parent fold into one "N parent folders" row. Each folder row has a menu (`FolderTreeRowMenu`) with the `FolderActions` of the list, without Rename (`showRename={false}`). The Home row and the "N parent folders" row have no menu. During a drag, rows are drop targets, and a collapsed row with subfolders opens after a 600 ms hover.

## Busy assets and permissions

`BusyAssetsProvider` maps an asset id to a busy message. `markBusy(id, message)` returns a release function. Call it in `finally`, so a failure clears the flag. `AssetActions` uses it during a replace from the item menu, because the menu has closed by the time the file picker returns. A busy card shows `BusyOverlay`, a busy row shows a loader instead of its thumbnail, and both ignore pointer events. The context is optional: without it, as in the picker, the replace runs with no feedback on the item. A drag move blocks the whole list instead, through `isMovePending` of `AssetsDndProvider`.

[`useMediaLibraryPermissions`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/hooks/useMediaLibraryPermissions.ts) changes the list as follows:

- `canCreate`: the "New" menu, the upload drop zone, both background menus, and the add button of the empty state.
- `canUpdate`: selection, the bulk actions bar and the selection menu.
- Asset menu: shown with any of `canUpdate`, `canCopyLink` and `canDownload`. Otherwise the browser menu opens.
- Folder menu: always shown. `FolderActions.tsx` has a TODO to gate rename, move and delete on `assets.update`.

## Related

- [Asset details drawer](./02-asset-details-drawer.md), [Forms](./03-forms.md), [Uploads](./04-uploads.md)
- [Media field and picker](./05-media-field-and-picker.md), [Drag and drop](./06-drag-and-drop.md)
- [Data fetching](./07-data-fetching.md), [Testing](./08-testing.md)
