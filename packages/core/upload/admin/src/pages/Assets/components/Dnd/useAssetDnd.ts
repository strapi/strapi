import { useMemo } from 'react';

import { useDndContext, useDraggable, useDroppable, type DraggableAttributes } from '@dnd-kit/core';

import { getRelationId } from '../../../../utils/getRelationId';

import { useAssetsDndOptional } from './AssetsDndProvider';
import { useAssetSortable } from './assetSortable';
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

  const sortable = useAssetSortable(asset.id);

  // In a reorderable list (the picker's Selected tab) dragging reorders
  // instead of moving between folders: the item takes the sortable's node,
  // pointer listeners and transform, and exposes a grip for the keyboard.
  if (sortable) {
    return {
      ...withoutDrag(draggable, false),
      setNodeRef: sortable.setNodeRef,
      isDragging: sortable.isDragging,
      listeners: sortable.listeners,
      dragStyle: sortable.style,
      dragHandle: sortable.handle,
      dragData: data,
    };
  }

  // `dragData` is re-exposed (like `useFolderDraggableDroppable` does) so the
  // row's actions menu can hand the move dialog the asset's real folder.
  return {
    ...withoutDrag(draggable, isDndEnabled),
    dragStyle: undefined,
    dragHandle: undefined,
    dragData: data,
  };
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
