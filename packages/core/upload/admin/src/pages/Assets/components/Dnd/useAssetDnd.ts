import { useMemo } from 'react';

import { useDndContext, useDraggable, useDroppable, type DraggableAttributes } from '@dnd-kit/core';

import { getRelationId } from '../../../../utils/getRelationId';

import { useAssetsDndOptional } from './AssetsDndProvider';
import { toFileDraggableId, toFolderDraggableId, toFolderTargetId } from './dndIds';

import type { DragFileData, DragFolderData, FolderTargetData } from '../../../../types/dnd';

/**
 * Without an `AssetsDndProvider` (the Content Manager asset picker mounts none)
 * items are not draggable: nothing handles the drop. Their drag attributes are
 * withheld too, so they aren't announced as draggable.
 */
const NO_DRAG_ATTRIBUTES: Partial<DraggableAttributes> = {};

const withoutDrag = <T extends { attributes: DraggableAttributes }>(
  draggable: T,
  isDndEnabled: boolean
) =>
  isDndEnabled ? draggable : { ...draggable, attributes: NO_DRAG_ATTRIBUTES, listeners: undefined };

export const useFileDraggable = (asset: {
  id: number;
  name: string;
  folder?: number | string | { id?: number } | null;
}) => {
  const dnd = useAssetsDndOptional();
  const isDndEnabled = dnd !== null;
  const isMovePending = dnd?.isMovePending ?? false;

  const data = useMemo<DragFileData>(
    () => ({
      kind: 'file',
      id: asset.id,
      name: asset.name,
      folderId: getRelationId(asset.folder),
    }),
    [asset.folder, asset.id, asset.name]
  );

  const draggable = useDraggable({
    id: toFileDraggableId(asset.id),
    data,
    disabled: !isDndEnabled || isMovePending,
  });

  // `dragData` is re-exposed (like `useFolderDraggableDroppable` does) so the
  // row's actions menu can hand the move dialog the asset's real folder.
  return { ...withoutDrag(draggable, isDndEnabled), dragData: data };
};

export const useFolderDraggableDroppable = (folder: {
  id: number;
  name: string;
  parent?: number | null | { id?: number };
}) => {
  const dnd = useAssetsDndOptional();
  const isDndEnabled = dnd !== null;
  const isMovePending = dnd?.isMovePending ?? false;
  const isValidDropTarget = dnd?.isValidDropTarget ?? (() => false);
  const { active } = useDndContext();

  const parentId = getRelationId(folder.parent);

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

  const draggable = withoutDrag(
    useDraggable({
      id: toFolderDraggableId(folder.id),
      data: dragData,
      disabled: !isDndEnabled || isMovePending,
    }),
    isDndEnabled
  );

  const droppable = useDroppable({
    id: toFolderTargetId(folder.id),
    data: dropData,
    disabled: !isDndEnabled || isMovePending,
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
