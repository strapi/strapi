import type { DragItemData } from '../types/dnd';

/**
 * Reconstruct the drag set from a bulk-actions selection so the dialog can feed
 * the exact same `DragItemData[]` into `computeValidDropTargets` / the canonical
 * `canDropItemOnFolder` predicate that pointer drag uses.
 *
 * Selection is page-scoped to the current folder, so every selected item shares
 * `currentFolderId` as its location (files → `folderId`, folders → `parentId`).
 * Names are irrelevant to drop validation, so they are left empty.
 */
export const buildDragSetFromSelection = (
  selectedIds: ReadonlySet<number>,
  selectedFolderIds: ReadonlySet<number>,
  currentFolderId: number | null
): DragItemData[] => {
  const items: DragItemData[] = [];

  selectedIds.forEach((id) => {
    items.push({ kind: 'file', id, name: '', folderId: currentFolderId });
  });

  selectedFolderIds.forEach((id) => {
    items.push({ kind: 'folder', id, name: '', parentId: currentFolderId });
  });

  return items;
};
