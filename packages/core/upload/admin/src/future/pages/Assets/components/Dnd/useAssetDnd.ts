import { useMemo } from 'react';

import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';

import { useGetFolderStructureQuery } from '../../../../services/folders';
import { canDropItemOnFolder } from '../../../../utils/canDropItemOnFolder';

import { useAssetsDndOptional } from './AssetsDndProvider';
import { toFileDraggableId, toFolderDraggableId, toFolderTargetId } from './dndIds';

import type {
  DragFileData,
  DragFolderData,
  DragItemData,
  FolderTargetData,
} from '../../../../types/dnd';

export const useFileDraggable = (asset: {
  id: number;
  name: string;
  folder?: number | string | null;
}) => {
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };

  const data = useMemo<DragFileData>(
    () => ({
      kind: 'file',
      id: asset.id,
      name: asset.name,
      folderId:
        asset.folder == null || typeof asset.folder === 'number' ? (asset.folder ?? null) : null,
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
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const { active } = useDndContext();
  const { data: folderStructure = [] } = useGetFolderStructureQuery();

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

  const activeData = active?.data.current as DragItemData | undefined;
  const activeItems = activeData ? [activeData] : [];

  const isValidDropTarget = useMemo(() => {
    if (!activeData || (activeData.id === folder.id && activeData.kind === 'folder')) {
      return false;
    }

    return canDropItemOnFolder({
      items: activeItems,
      targetFolderId: folder.id,
      folderStructure,
    });
  }, [activeData, activeItems, folder.id, folderStructure]);

  const isOver = droppable.isOver;
  const showValidDropHighlight = isOver && isValidDropTarget;
  const showInvalidDropCursor = isOver && !isValidDropTarget && active != null;

  return {
    dragData,
    draggable,
    droppable,
    isDragging: draggable.isDragging,
    showValidDropHighlight,
    showInvalidDropCursor,
  };
};
