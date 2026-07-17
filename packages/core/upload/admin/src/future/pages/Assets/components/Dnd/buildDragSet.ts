import { assetKey, folderKey, type ItemKey } from '../../utils/selection';

import type { DragItemData } from '../../../../types/dnd';

export interface DragSet {
  items: DragItemData[];
  /** True when the active item was already selected — membership is the full selection. */
  fromSelection: boolean;
}

/**
 * Derive the drag payload once at drag start.
 *
 * - Dragging a selected item moves the complete current selection.
 * - Dragging an unselected item moves only that item.
 *
 * Selection is page-scoped to the current folder, so every selected item shares
 * the active item's parent/folder location for move validation.
 */
export const buildDragSet = (
  activeData: DragItemData,
  selectedKeys: Set<ItemKey> | undefined
): DragSet => {
  if (!selectedKeys || selectedKeys.size === 0) {
    return { items: [activeData], fromSelection: false };
  }

  const activeKey: ItemKey =
    activeData.kind === 'file' ? assetKey(activeData.id) : folderKey(activeData.id);

  if (!selectedKeys.has(activeKey)) {
    return { items: [activeData], fromSelection: false };
  }

  const currentFolderId = activeData.kind === 'file' ? activeData.folderId : activeData.parentId;
  const items: DragItemData[] = [];

  selectedKeys.forEach((key) => {
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    const id = Number(key.slice(separator + 1));

    if (kind === 'asset') {
      items.push({
        kind: 'file',
        id,
        name: activeData.kind === 'file' && activeData.id === id ? activeData.name : '',
        folderId: currentFolderId,
      });
      return;
    }

    items.push({
      kind: 'folder',
      id,
      name: activeData.kind === 'folder' && activeData.id === id ? activeData.name : '',
      parentId: currentFolderId,
    });
  });

  return { items, fromSelection: true };
};
