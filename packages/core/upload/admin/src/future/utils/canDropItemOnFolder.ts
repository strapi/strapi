import type { FolderNode } from '../../../../shared/contracts/folders';
import type { DragItemData } from '../types/dnd';

// TODO: permission-aware droppables — server validates in v1.

export interface CanDropItemOnFolderParams {
  items: DragItemData[];
  targetFolderId: number;
  folderStructure: FolderNode[];
}

const findNode = (nodes: FolderNode[], id: number): FolderNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const found = findNode(node.children, id);
    if (found) {
      return found;
    }
  }

  return null;
};

const collectDescendantIds = (node: FolderNode): Set<number> => {
  const ids = new Set<number>();

  const walk = (current: FolderNode) => {
    for (const child of current.children) {
      if (child.id != null) {
        ids.add(child.id);
      }
      walk(child);
    }
  };

  walk(node);
  return ids;
};

export const isFolderDescendantOf = (
  folderStructure: FolderNode[],
  ancestorId: number,
  candidateId: number
): boolean => {
  if (ancestorId === candidateId) {
    return true;
  }

  const ancestorNode = findNode(folderStructure, ancestorId);
  if (!ancestorNode) {
    return false;
  }

  return collectDescendantIds(ancestorNode).has(candidateId);
};

export const canDropItemOnFolder = ({
  items,
  targetFolderId,
  folderStructure,
}: CanDropItemOnFolderParams): boolean => {
  if (items.length === 0) {
    return false;
  }

  const draggedFolderIds = new Set(
    items
      .filter((item): item is Extract<DragItemData, { kind: 'folder' }> => item.kind === 'folder')
      .map((item) => item.id)
  );

  if (draggedFolderIds.has(targetFolderId)) {
    return false;
  }

  for (const folderId of draggedFolderIds) {
    if (isFolderDescendantOf(folderStructure, folderId, targetFolderId)) {
      return false;
    }
  }

  for (const item of items) {
    if (item.kind === 'file' && item.folderId === targetFolderId) {
      return false;
    }
  }

  return true;
};
