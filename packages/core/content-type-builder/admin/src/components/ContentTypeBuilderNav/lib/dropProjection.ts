import { arrayMove } from '@dnd-kit/sortable';

import { MAX_FOLDER_DEPTH } from '../../DataManager/utils/contentStructure';

import { canNestFolderAt, subtreeFolderHeight } from './buildFolderTree';

import type { FlatItem } from './flatModel';

export const INDENT_WIDTH = 24; // theme.spaces[6]

/**
 * Temporary flag to disable root content-type reordering.
 */
const ROOT_CONTENT_TYPE_REORDER = false;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export type DropLine = {
  edge: 'top' | 'bottom';
  anchorId: string;
};

export type InsertTarget = {
  parentId: string | null;
  line: DropLine | null;
  index: number;
  depth: number;
};

export type DropTarget =
  | { kind: 'nest'; folderId: string; depth: number }
  | ({ kind: 'insert' } & InsertTarget);

/**
 * Locates the position for the line indicator given that root-level re-ordering is currently
 * not possible. This is temporary measure until root-level re-ordering is implemented.
 */
function getDropTargetSectionRoot(items: FlatItem[], activeId: string): InsertTarget {
  const rootItems = items.filter((item) => item.depth === 0 && item.id !== activeId);

  const lastRootLeaf = [...rootItems].reverse().find((item) => item.node.type === 'contentType');
  const firstRootFolder = rootItems.find((item) => item.node.type === 'folder');

  const line: DropLine | null = (() => {
    if (firstRootFolder) {
      return { anchorId: firstRootFolder.id, edge: 'top' };
    }

    if (lastRootLeaf) {
      return { anchorId: lastRootLeaf.id, edge: 'bottom' };
    }

    return null;
  })();

  return { parentId: null, index: 0, depth: 0, line };
}

function getDropTargetBetweenRows(
  items: FlatItem[],
  activeId: string,
  overId: string,
  offsetX: number,
  side?: 'before' | 'after'
): InsertTarget | null {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);

  if (overIndex === -1 || activeIndex === -1) {
    return null;
  }

  const active = items[activeIndex];

  const { rowsBeforeSlot, previous, next } = (() => {
    if (side) {
      const withoutActive = items.filter((item) => item.id !== activeId);
      const overPos = withoutActive.findIndex((item) => item.id === overId);
      const insertPos = side === 'before' ? overPos : overPos + 1;

      return {
        rowsBeforeSlot: withoutActive.slice(0, insertPos),
        previous: withoutActive[insertPos - 1],
        next: withoutActive[insertPos],
      };
    }

    const reordered = arrayMove(items, activeIndex, overIndex);

    return {
      rowsBeforeSlot: reordered.slice(0, overIndex),
      previous: reordered[overIndex - 1],
      next: reordered[overIndex + 1],
    };
  })();

  const dragDepth = Math.round(offsetX / INDENT_WIDTH);
  const projectedDepth = active.depth + dragDepth;

  const minDepth = next ? next.depth : 0;

  let maxDepth: number;
  if (!previous) {
    maxDepth = 0;
  } else if (previous.node.type === 'folder' && !previous.collapsed) {
    maxDepth = previous.depth + 1;
  } else {
    maxDepth = previous.depth;
  }

  if (active.node.type === 'folder') {
    const folderCeiling = MAX_FOLDER_DEPTH - subtreeFolderHeight(active.node);
    maxDepth = Math.min(maxDepth, folderCeiling);
  }

  if (maxDepth < minDepth) {
    return null;
  }
  const depth = clamp(projectedDepth, minDepth, maxDepth);

  const parentId = ((): string | null => {
    if (depth === 0 || !previous) {
      return null;
    }

    if (depth === previous.depth) {
      return previous.parentId;
    }

    if (depth > previous.depth) {
      return previous.node.type === 'folder' ? previous.node.id : previous.parentId;
    }

    const ancestor = [...rowsBeforeSlot].reverse().find((item) => item.depth === depth);

    return ancestor ? ancestor.parentId : null;
  })();

  let index = 0;

  for (const item of rowsBeforeSlot) {
    if (item.parentId !== parentId || item.depth !== depth) {
      continue;
    }

    if (parentId === null && item.node.type !== 'folder') {
      continue;
    }

    index += 1;
  }

  const line: DropLine | null = (() => {
    if (next) {
      return { anchorId: next.id, edge: 'top' };
    }

    if (previous) {
      return { anchorId: previous.id, edge: 'bottom' };
    }

    return null;
  })();

  /** For the time being, root content types have no stored order, so trying to move something there is not a real re-order operation. */
  const insertingAmongRootContentTypes =
    parentId === null &&
    next !== undefined &&
    next.node.type === 'contentType' &&
    next.parentId === null;

  if (!ROOT_CONTENT_TYPE_REORDER && insertingAmongRootContentTypes) {
    return getDropTargetSectionRoot(items, activeId);
  }

  return { parentId, index, depth, line };
}

function getDropTargetFolderSibling(
  items: FlatItem[],
  activeId: string,
  folderId: string,
  side: 'before' | 'after'
): InsertTarget | null {
  const folderIndex = items.findIndex((item) => item.id === folderId);
  const active = items.find((item) => item.id === activeId);

  if (folderIndex === -1 || !active) {
    return null;
  }

  const folder = items[folderIndex];
  const { parentId, depth } = folder;

  if (
    active.node.type === 'folder' &&
    depth + subtreeFolderHeight(active.node) > MAX_FOLDER_DEPTH
  ) {
    return null;
  }

  const boundary = side === 'before' ? folderIndex : folderIndex + 1;
  let index = 0;

  for (let i = 0; i < boundary; i += 1) {
    const item = items[i];

    if (item.id === activeId) {
      continue;
    }

    if (item.parentId !== parentId || item.depth !== depth) {
      continue;
    }

    if (parentId === null && item.node.type !== 'folder') {
      continue;
    }

    index += 1;
  }

  const line: DropLine = (() => {
    if (side === 'before') {
      return { anchorId: folder.id, edge: 'top' };
    }

    let lastIndex = folderIndex;

    for (let i = folderIndex + 1; i < items.length; i += 1) {
      if (items[i].depth <= depth) {
        break;
      }

      lastIndex = i;
    }

    return { anchorId: items[lastIndex].id, edge: 'bottom' };
  })();

  return { parentId, index, depth, line };
}

type DragState = {
  activeId: string;
  overId: string;
  offsetX: number;
  pointer?: { x: number; y: number };
  overRect?: { top: number; height: number };
};

/**
 * This resolved the destination for a drag-and-drop operation in the contentStructure tree. It takes into account the active item being dragged, the item it is being dropped over, the horizontal offset of the drag, and optionally which side of the target item the drop is intended for.
 * It returns a DropTarget object that describes where the active item should be placed in relation to its siblings and parent in the tree structure.
 *
 * When the dragged row is over a non-folder row, the drop target is always a sibling of that row (and its destination is based on which half of the row the pointer is over).
 *
 * When the dragged row is over a folder row, the drop target can be either a sibling of that folder (if the pointer is over the top or bottom third of the row) or a child of that folder (if the pointer is over the middle third of the row).
 * If the folder is collapsed, dropping into it will expand it and place the active row inside it.
 *
 * If the destination is nested such that the destination could be one of several depths, the depth is determined by the horizontal offset of the pointer.
 *
 * This allows for a user to position a row at the end of a folder, even if there are several expanded folders above the destination. Otherwise, this would be a multi-step operation.
 *
 */
export function resolveDropTarget(items: FlatItem[], dragState: DragState): DropTarget | null {
  const { activeId, overId, offsetX, pointer, overRect } = dragState;

  const itemHoveredByCursor = items.find((item) => item.id === overId);

  // If item is valid FoldeRNode
  if (itemHoveredByCursor && itemHoveredByCursor.node.type === 'folder' && pointer && overRect) {
    const folderNode = itemHoveredByCursor.node;

    const nextItem = items[items.indexOf(itemHoveredByCursor) + 1];
    const hasVisibleChildren = nextItem != null && nextItem.depth > itemHoveredByCursor.depth;

    // Determine which zone of the folder row the pointer is in (top, middle, bottom).
    const zone = calculateFolderDropZone({
      itemBoundingBox: overRect,
      pointerY: pointer.y,
      hasVisibleChildren,
    });

    if (zone === 'nest') {
      if (overId === activeId) {
        return null;
      }

      const activeNode = items.find(({ id }) => id === activeId)?.node;
      const nestIsValid =
        activeNode == null ||
        activeNode.type !== 'folder' ||
        canNestFolderAt(activeNode, folderNode);

      if (!nestIsValid) {
        return null;
      }

      return { kind: 'nest', folderId: folderNode.id, depth: itemHoveredByCursor.depth + 1 };
    }

    const sibling = getDropTargetFolderSibling(items, activeId, overId, zone);
    if (sibling) {
      return { kind: 'insert', ...sibling };
    }
  }

  const side = (() => {
    if (!pointer || !overRect) {
      return undefined;
    }

    return pointer.y < overRect.top + overRect.height / 2 ? 'before' : 'after';
  })();

  const insert = getDropTargetBetweenRows(items, activeId, overId, offsetX, side);

  return insert ? { kind: 'insert', ...insert } : null;
}

export type FolderDropZone = 'before' | 'nest' | 'after';

/**
 * Configuration for the folder drop zones.
 *
 * There are three zones and several possible behaviors:
 *  1. The top zone of the folder row ("beore"). This drops the the dragged row above the folder row.
 *  2. The bottom zone of the folder row ("after"). This drops the dragged row below the folder row.
 *  If the folder is expanded:
 *    3. The middle zone of the folder row ("nest"). This drops the dragged row inside the folder row.
 *  If the folder is collapsed:
 *   3A. The middle zone of the folder row ("nest"). This drops the dragged row inside the folder row.
 *   3B. If the folder is held over the middle zone for a certain amount of time, the folder will expand and the dragged row can be dropped inside the folder row.
 */

const NEST_ZONE_BOTTOM = 0.8;
const NEST_ZONE_TOP = 0.2;

type CalculateFolderDropZoneProps = {
  itemBoundingBox: { top: number; height: number };
  hasVisibleChildren: boolean;
  pointerY: number;
};

export function calculateFolderDropZone({
  hasVisibleChildren,
  itemBoundingBox,
  pointerY,
}: CalculateFolderDropZoneProps): FolderDropZone {
  if (pointerY < itemBoundingBox.top + itemBoundingBox.height * NEST_ZONE_TOP) {
    return 'before';
  }

  if (
    !hasVisibleChildren &&
    pointerY > itemBoundingBox.top + itemBoundingBox.height * NEST_ZONE_BOTTOM
  ) {
    return 'after';
  }

  return 'nest';
}
