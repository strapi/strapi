---
title: Drag and drop
description: 'How the Media Library page moves assets and folders by drag and drop, the drop rules, and the keyboard path through the move dialog.'
tags:
  - frontend
---

# Drag and drop

On the Media Library page, a user moves assets and folders by dragging them onto a folder. The code is in [`pages/Assets/components/Dnd/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/pages/Assets/components/Dnd). [`AssetsDndProvider.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/components/Dnd/AssetsDndProvider.tsx) owns the `DndContext`. `AssetsPage.tsx` mounts it around both the sidebar folder tree and the list, so a drag can start in the list and end in the tree.

The media field picker reuses the list components without this provider. `useFileDraggable` and `useFolderDraggableDroppable` in `Dnd/useAssetDnd.ts` then disable dragging and withhold the drag attributes and listeners, because nothing would handle the drop. The reordering in the Selected tab of the picker uses its own `DndContext` (see [Media field and picker](./05-media-field-and-picker.md)).

## Library and sensors

The page uses `@dnd-kit/core` and the `snapCenterToCursor` modifier of `@dnd-kit/modifiers`.

- **One `PointerSensor`** with `activationConstraint: { distance: 8 }`. A press that moves less than 8px stays a click, so a click still opens an asset or enters a folder. The sensor starts only on the primary button. Escape cancels a drag in progress.
- **`pointerWithin`** collision detection: the drop target is the droppable under the pointer, not the one that the dragged rectangle overlaps most.
- **Move permission**: moving needs `canUpdate` from `useMediaLibraryPermissions`, which is the `plugin::upload.assets.update` action. The bulk move route requires the same action. Without it, the activation distance becomes `DRAG_DISABLED_DISTANCE` (`Number.MAX_SAFE_INTEGER`), which no gesture reaches. Do not remove the sensor instead. `canUpdate` is false until the RBAC check resolves, so its value changes after the first render. `useSensors` uses its arguments as the dependency list of a `useMemo`, so React reports an error when their number changes between renders. A conditional `useSensor` call would also break the rules of hooks.
- **One move at a time**: while the `bulkMove` mutation runs, `isMovePending` is true. Every draggable and droppable is disabled. Cards, rows and tree rows get `pointer-events: none` and the `wait` cursor. `handleDragEnd` also returns early.

## What gets dragged

`buildDragSet` in `Dnd/buildDragSet.ts` computes the drag set at drag start, and the move uses that set:

- If the grabbed item is not selected, only that item moves. The selection does not change.
- If the grabbed item is selected, the whole selection moves (`fromSelection`). The provider clears the selection after a successful move. A cancelled drag or a failed move keeps it.

Each item is a `DragItemData` from [`types/dnd.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/types/dnd.ts): a file with its `folderId`, or a folder with its `parentId`. The grabbed item takes its location from its own row. The other selected items take it from `locations`, an `ItemLocations` lookup that `AssetsPage` builds from the loaded rows with `buildItemLocations` in [`utils/itemLocations.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/utils/itemLocations.ts). The folder currently open is not a valid stand-in, because a search across folders returns items from anywhere. `locateItem` falls back to the open folder only for an id that is not in the loaded rows. In the lookup, `undefined` means "not loaded" and `null` means "at the root". Keep them apart. The selected items other than the grabbed one have an empty `name`, because validation does not need it.

### The drag overlay

`DragOverlay` renders `DragOverlayChip` (`data-testid="drag-overlay-chip"`). For one item, the chip shows its icon and name. For several, it shows a count per kind and a total badge. The grabbed item stays in place at 40% opacity.

`snapCenterToCursor` centers the chip on the pointer. Without it, the overlay starts at the top-left corner of the dragged node, so the chip trails the cursor by the distance from that corner to the grab point. On a wide table row, that distance is large. `dropAnimation` is `null`, so the chip disappears on drop instead of animating back.

## Drop targets

| Target                                   | Hook                                     | dnd-kit id                     | Destination       |
| ---------------------------------------- | ---------------------------------------- | ------------------------------ | ----------------- |
| Folder card (grid) or folder row (table) | `useFolderDraggableDroppable`            | `folder-target:<id>`           | That folder       |
| Folder row of the sidebar tree           | `useFolderTreeDroppable`                 | `folder-tree-target:<id>`      | That folder       |
| Home row of the sidebar tree             | `useFolderTreeDroppable` with `id: null` | `folder-tree-target:home`      | The root (`null`) |
| "N parent folders" row of the tree       | `useDroppable` in `CollapsedAncestors`   | `folder-tree-summary:<rootId>` | None              |

`Dnd/dndIds.ts` builds and parses these ids. `resolveDestination` in the provider parses only `folder-target` and `folder-tree-target` ids, so a drop on the summary row moves nothing. That row is a droppable only so that hovering it opens it. Without it, the folders it hides could not be reached during a drag. The list itself has no root target, so a drag to the root goes through Home.

Hovering a collapsed tree folder that has subfolders for `SPRING_LOAD_DELAY_MS` (600 ms) expands it, through `useSpringLoadedExpand` in [`FolderTree/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/pages/Assets/components/FolderTree). The summary row opens the same way. A valid target gets a dashed highlight. An invalid target gets `cursor: not-allowed` and no highlight.

## Drop rules

[`canDropItemOnFolder`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/utils/canDropItemOnFolder.ts) decides every drop. A folder target is valid when all of these hold:

- The drag set is not empty.
- No dragged folder is the target, and the target is not a descendant of a dragged folder. `isFolderDescendantOf` walks the tree from `getFolderStructure`.
- No item already lives in the target. One item that would not move blocks the whole drop.

The root is valid when at least one item is not already at the root.

`computeValidDropTargets` evaluates the predicate once per drag set, for the root and for every folder of the structure, and returns a `Set`. Each droppable reads `isValidDropTarget(id)` from the context, so hovering does not walk the tree. `handleDragEnd` runs `canDropItemOnFolder` again before it sends the request, so the highlight is not the guard.

`BulkMoveDialog` filters its destinations with the same predicate, and `buildDragSetFromSelection` in `utils/buildDragSetFromSelection.ts` turns a selection into the same `DragItemData[]`. A change to `canDropItemOnFolder` applies to both paths. Do not add a rule to only one of them.

The client checks neither permissions per target (a TODO in `canDropItemOnFolder.ts`) nor name collisions. On the server, `validateMoveManyFoldersFiles` in [`controllers/validation/admin/folder-file.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/server/src/controllers/validation/admin/folder-file.ts) checks that the destination exists, that no moved folder has the name of a folder in the destination, and that no folder moves into itself or a descendant.

## The move request

`buildBulkMovePayload` splits the drag set into file ids and folder ids. The `bulkMove` mutation in [`services/folders.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/services/folders.ts) sends one `POST /upload/actions/bulk-move` request for the whole set:

```json
{ "fileIds": [12], "folderIds": [3], "destinationFolderId": 7 }
```

A `destinationFolderId` of `null` moves the items to the root.

## Internal drags and file uploads

The upload drop zone in [`DropZone/`](https://github.com/strapi/strapi/tree/develop/packages/core/upload/admin/src/pages/Assets/components/DropZone) listens to HTML5 drag events. dnd-kit uses pointer events. These checks keep the two apart:

- An internal drag starts no HTML5 drag. Asset cards and table rows cancel `dragstart`, the grid thumbnails set `draggable={false}`, and the pointer sensor cancels `dragstart` on the window while a press is pending or active. The drop zone receives no `dragenter` from it.
- `UploadDropZoneProvider` ignores a `dragenter` whose `dataTransfer.types` does not include `Files`, such as text dragged from another page.
- `DropZoneWithOverlay` and `DropFilesMessage` hide while `isInternalDragActive` from `useAssetsDndOptional()` is true.

Without the `assets.create` permission, the zone is `disabled` and never shows. [Uploads](./04-uploads.md) covers what a file drop does.

## Keyboard and screen readers

There is no `KeyboardSensor`. Its default keys are Space and Enter, and the cards and rows already use Space to toggle the selection and Enter to open the asset or folder. The keyboard path is the move dialog:

1. Focus an item and press Space to select it (see [Asset list](./01-asset-list.md)).
2. Press the Move button of the bulk actions bar. It opens [`BulkMoveDialog`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/components/BulkMoveDialog.tsx).

The "Move to folder" item in the actions menu of one asset or folder opens the same dialog. The dialog lists destinations by their full path and filters them with `canDropItemOnFolder`, so the [drop rules](#drop-rules) apply. A folder where any selected item already lives is left out, even if other items would move there.

`BulkMoveDialog` does not check permissions. Its callers do: the bulk actions bar renders nothing without `canUpdate`, and the asset actions show Move only with it. Without `canUpdate`, `AssetsPage` also disables the selection. `FolderActions.tsx` does not gate Move yet, and a TODO there tracks it. The server enforces the permission in every case.

`AssetsDndProvider` passes `announcements` to `DndContext` through its `accessibility` prop. The drop announcement builds the drag set again from the selection at drop time:

| Event                            | Announcement                                  |
| -------------------------------- | --------------------------------------------- |
| Drag start                       | "Picked up {name}. Drop on a folder to move." |
| Drag over                        | Nothing                                       |
| Drop on an invalid target        | "Cannot move item to this folder."            |
| Drop outside a target, or cancel | "Drag cancelled."                             |
| Drop on a valid target           | Nothing, because the request has not run yet  |
| Drop on the summary row          | Nothing                                       |

The result of the move goes to a separate `aria-live="polite"` region in the provider. `announceToLiveRegion` empties the region and writes the message on the next animation frame, so the same message twice in a row is still a change that screen readers announce.

The cards and rows spread the dnd-kit `attributes`, then override `role` and `tabIndex`. They keep `aria-roledescription="draggable"` and an `aria-describedby` that points to the default dnd-kit instructions, which describe a drag with the Space key. The provider does not pass `screenReaderInstructions`.

## After a move

On success, the provider shows a `toggleNotification` toast and announces the same text. `formatMoveSuccessMessage` builds it, for example "2 elements have been moved from Images to Archive". The source is the folder of the grabbed item, not the folder currently open. When the set comes from several folders (`spansMultipleSources`, computed with `sourceFolderIdOf` from `utils/itemSource.ts`), the message leaves out the source: "2 elements have been moved to Archive". The drag path names folders by their own name with `getFolderLabel`. It names the root with the `plugin.name` message (Media Library), not with the Home label of the tree. `BulkMoveDialog` also builds its message with `formatMoveSuccessMessage`, but does not use `getFolderLabel`: it takes the source name from `getFolder` and the destination from the label of its option, which is the full path.

On failure, the toast shows the server message, or "An error occurred while moving the items." when there is none. The live region announces "Move failed." followed by that message.

`bulkMove` invalidates the asset list, the folder lists and the folder structure, so the list, the tree and the valid targets refresh (see [Data fetching](./07-data-fetching.md)).

## Tests

Unit tests are in `Dnd/tests/`, `FolderTree/tests/` and `utils/tests/`. The e2e specs are in [`tests/e2e/tests/media-library/`](https://github.com/strapi/strapi/tree/develop/tests/e2e/tests/media-library):

- `drag-drop-shallow.spec.ts`: files and folders onto folders in both views, a folder onto itself, the success toast, and the chip centered under the pointer within 1px.
- `drag-drop-deep.spec.ts`: the sidebar targets, spring-loading, a folder hidden behind the summary row, Home, the descendant guard, and a mixed selection that clears after the move.
- `bulk-move.spec.ts`: the move dialog.

The helpers are in `page-objects/AssetsPage.ts`: `dragItemToFolder`, `dragItemToTreeFolder`, `dragItemToHome`, `dragFolderToSelf`, `grabItemAndHold`, and `springLoadFolder` or `springLoadOnto` followed by `dropDraggedItemOn`. They drive `page.mouse`. The drag helpers press at the center of the item and move 12px to pass the 8px activation distance before going anywhere else. If you raise the activation distance, update that first step. `dropDraggedItemOn` only finishes a drag that a hold or spring-load helper started. `waitForMoveSuccess` waits for a notification that contains "been moved". See [Testing](./08-testing.md) for how to run the suites.
