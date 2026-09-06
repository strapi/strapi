import { locateItem, type ItemLocations } from './itemLocations';

import type { DragItemData } from '../types/dnd';

/**
 * Reconstruct the drag set from a bulk-actions selection so the dialog can feed
 * the exact same `DragItemData[]` into `computeValidDropTargets` / the canonical
 * `canDropItemOnFolder` predicate that pointer drag uses.
 *
 * Each item's location comes from the loaded row, not from the folder currently
 * open: search results are global, so a selected item can live anywhere.
 * Names are irrelevant to drop validation, so they are left empty.
 */
export const buildDragSetFromSelection = (
  selectedIds: ReadonlySet<number>,
  selectedFolderIds: ReadonlySet<number>,
  locations: ItemLocations,
  fallbackFolderId: number | null
): DragItemData[] => {
  const items: DragItemData[] = [];

  selectedIds.forEach((id) => {
    items.push({
      kind: 'file',
      id,
      name: '',
      folderId: locateItem(locations, 'file', id, fallbackFolderId),
    });
  });

  selectedFolderIds.forEach((id) => {
    items.push({
      kind: 'folder',
      id,
      name: '',
      parentId: locateItem(locations, 'folder', id, fallbackFolderId),
    });
  });

  return items;
};
