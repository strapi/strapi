import { locateItem, type ItemLocations } from '../../../../utils/itemLocations';
import { sourceFolderIdOf } from '../../../../utils/itemSource';
import { assetKey, folderKey, type ItemKey } from '../../utils/selection';

import type { DragItemData } from '../../../../types/dnd';

export interface DragSet {
  items: DragItemData[];
  /** True when the active item was already selected — membership is the full selection. */
  fromSelection: boolean;
  /**
   * Location of the row the user actually grabbed — the only item in the set
   * whose origin the user can point at. Names the source in the success toast.
   */
  activeSourceFolderId: number | null;
  /**
   * True when the set spans more than one source folder, which a global search
   * selection can. There is then no single source to name, so the toast has to
   * drop it rather than pick one item's folder and imply the others came from
   * there too.
   */
  spansMultipleSources: boolean;
}

/**
 * Derive the drag payload once at drag start.
 *
 * - Dragging a selected item moves the complete current selection.
 * - Dragging an unselected item moves only that item.
 *
 * The active item carries its own location on `dragData` (the row it was
 * grabbed from); the rest of the selection is resolved through `locations`.
 * Neither is derived from the folder currently open, because search results are
 * global — see `utils/itemLocations.ts`.
 */
export const buildDragSet = (
  activeData: DragItemData,
  selectedKeys: Set<ItemKey> | undefined,
  locations: ItemLocations,
  fallbackFolderId: number | null
): DragSet => {
  const activeKey: ItemKey =
    activeData.kind === 'file' ? assetKey(activeData.id) : folderKey(activeData.id);

  const activeSourceFolderId = sourceFolderIdOf(activeData);

  if (!selectedKeys || !selectedKeys.has(activeKey)) {
    return {
      items: [activeData],
      fromSelection: false,
      activeSourceFolderId,
      spansMultipleSources: false,
    };
  }

  const items: DragItemData[] = [];

  selectedKeys.forEach((key) => {
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    const id = Number(key.slice(separator + 1));

    if (kind === 'asset') {
      if (activeData.kind === 'file' && activeData.id === id) {
        items.push(activeData);
        return;
      }

      items.push({
        kind: 'file',
        id,
        name: '',
        folderId: locateItem(locations, 'file', id, fallbackFolderId),
      });
      return;
    }

    if (activeData.kind === 'folder' && activeData.id === id) {
      items.push(activeData);
      return;
    }

    items.push({
      kind: 'folder',
      id,
      name: '',
      parentId: locateItem(locations, 'folder', id, fallbackFolderId),
    });
  });

  return {
    items,
    fromSelection: true,
    activeSourceFolderId,
    spansMultipleSources: items.some((item) => sourceFolderIdOf(item) !== activeSourceFolderId),
  };
};
