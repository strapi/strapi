import { useMemo } from 'react';

import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';

import { useAssetsDndOptional } from './AssetsDndProvider';
import { toFileDraggableId, toFolderDraggableId, toFolderTargetId } from './dndIds';

import type { DragFileData, DragFolderData, FolderTargetData } from '../../../../types/dnd';

const getFileFolderId = (
  folder: number | string | { id?: number } | null | undefined
): number | null => {
  if (folder == null) {
    return null;
  }

  if (typeof folder === 'object') {
    return folder.id ?? null;
  }

  if (typeof folder === 'number') {
    return folder;
  }

  return Number(folder) || null;
};

export const useFileDraggable = (asset: {
  id: number;
  name: string;
  folder?: number | string | { id?: number } | null;
}) => {
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };

  const data = useMemo<DragFileData>(
    () => ({
      kind: 'file',
      id: asset.id,
      name: asset.name,
      folderId: getFileFolderId(asset.folder),
    }),
    [asset.folder, asset.id, asset.name]
  );

  return useDraggable({
    id: toFileDraggableId(asset.id),
    data,
    disabled: isMovePending,
  });
};

export const useFolderDraggableDroppable = (folder: {
  id: number;
  name: string;
  parent?: number | null | { id?: number };
}) => {
  const { isMovePending, isValidDropTarget } = useAssetsDndOptional() ?? {
    isMovePending: false,
    isValidDropTarget: () => false,
  };
  const { active } = useDndContext();

  const parentId =
    typeof folder.parent === 'object' && folder.parent != null
      ? (folder.parent.id ?? null)
      : (folder.parent ?? null);

  const dragData = useMemo<DragFolderData>(
    () => ({
      kind: 'folder',
      id: folder.id,
      name: folder.name,
      parentId,
    }),
    [folder.id, folder.name, parentId]
  );

  const dropData = useMemo<FolderTargetData>(
    () => ({
      kind: 'folder-target',
      id: folder.id,
      name: folder.name,
    }),
    [folder.id, folder.name]
  );

  const draggable = useDraggable({
    id: toFolderDraggableId(folder.id),
    data: dragData,
    disabled: isMovePending,
  });

  const droppable = useDroppable({
    id: toFolderTargetId(folder.id),
    data: dropData,
    disabled: isMovePending,
  });

  const isValidTarget = isValidDropTarget(folder.id);
  const isOver = droppable.isOver;
  const showValidDropHighlight = isOver && isValidTarget;
  const showInvalidDropCursor = isOver && !isValidTarget && active != null;

  return {
    dragData,
    draggable,
    droppable,
    isDragging: draggable.isDragging,
    showValidDropHighlight,
    showInvalidDropCursor,
  };
};
