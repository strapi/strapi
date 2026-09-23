import { useDndContext, useDroppable } from '@dnd-kit/core';

import { useAssetsDndOptional } from './AssetsDndProvider';
import { HOME_TREE_TARGET_ID, toFolderTreeTargetId } from './dndIds';

import type { FolderTreeTargetData } from '../../../../types/dnd';

export const useFolderTreeDroppable = (
  target: { id: number; name: string } | { id: null; name: string }
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

  const droppable = useDroppable({ id: dropId, data, disabled: isMovePending });

  const isValidTarget = isValidDropTarget(target.id);
  const isOver = droppable.isOver;

  return {
    droppable,
    isOver,
    showValidDropHighlight: isOver && isValidTarget,
    showInvalidDropCursor: isOver && !isValidTarget && active != null,
  };
};
