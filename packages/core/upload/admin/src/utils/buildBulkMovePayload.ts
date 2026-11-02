import type { BulkMovePayload, DragItemData } from '../types/dnd';

export const buildBulkMovePayload = (items: DragItemData[]): BulkMovePayload => {
  const fileIds: number[] = [];
  const folderIds: number[] = [];

  for (const item of items) {
    if (item.kind === 'file') {
      fileIds.push(item.id);
    } else {
      folderIds.push(item.id);
    }
  }

  return { fileIds, folderIds };
};
