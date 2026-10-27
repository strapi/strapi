import { useDndContext, useDroppable } from '@dnd-kit/core';

import { useAssetsDndOptional } from './AssetsDndProvider';
import { HOME_TREE_TARGET_ID, toFolderTreeTargetId } from './dndIds';

import type { FolderTreeTargetData } from '../../../../types/dnd';

export const useFolderTreeDroppable = (
  target: ({ id: number; name: string } | { id: null; name: string }) & { readOnly?: boolean }
) => {
  const { isMovePending, isValidDropTarget } = useAssetsDndOptional() ?? {
    isMovePending: false,
    isValidDropTarget: () => false,
  };
  const { active } = useDndContext();

  const dropId = target.id == null ? HOME_TREE_TARGET_ID : toFolderTreeTargetId(target.id);
  const data: FolderTreeTargetData = {
    kind: 'folder-tree-target',
    id: target.id,
    name: target.name,
  };

  // Nothing moves into a read-only folder
  const droppable = useDroppable({
    id: dropId,
    data,
    disabled: isMovePending || Boolean(target.readOnly),
  });

  const isValidTarget = isValidDropTarget(target.id);
  const isOver = droppable.isOver;

  return {
    droppable,
    isOver,
    showValidDropHighlight: isOver && isValidTarget,
    showInvalidDropCursor: isOver && !isValidTarget && active != null,
  };
};
