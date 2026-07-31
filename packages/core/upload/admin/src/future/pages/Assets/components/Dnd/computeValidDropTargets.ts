import { canDropItemOnFolder } from '../../../../utils/canDropItemOnFolder';
import { flattenFolderStructure } from '../../../../utils/flattenFolderStructure';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';
import type { DragItemData } from '../../../../types/dnd';

/**
 * Evaluate destination validity once for the full drag set. Callers look up
 * targets in O(1) via {@link Set.has} — `null` represents the Home/root drop.
 */
export const computeValidDropTargets = (
  items: DragItemData[],
  folderStructure: FolderNode[]
): Set<number | null> => {
  const valid = new Set<number | null>();

  if (items.length === 0) {
    return valid;
  }

  if (canDropItemOnFolder({ items, targetFolderId: null, folderStructure })) {
    valid.add(null);
  }

  for (const { id } of flattenFolderStructure(folderStructure)) {
    if (canDropItemOnFolder({ items, targetFolderId: id, folderStructure })) {
      valid.add(id);
    }
  }

  return valid;
};
