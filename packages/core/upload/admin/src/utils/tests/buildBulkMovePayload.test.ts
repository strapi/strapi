import { buildBulkMovePayload } from '../buildBulkMovePayload';

import type { DragItemData } from '../../types/dnd';

describe('buildBulkMovePayload', () => {
  it('splits files and folders into separate id arrays', () => {
    const items: DragItemData[] = [
      { kind: 'file', id: 1, name: 'a.png', folderId: null },
      { kind: 'folder', id: 2, name: 'Docs', parentId: null },
      { kind: 'file', id: 3, name: 'b.pdf', folderId: 2 },
    ];

    expect(buildBulkMovePayload(items)).toEqual({
      fileIds: [1, 3],
      folderIds: [2],
    });
  });

  it('returns empty arrays for an empty selection', () => {
    expect(buildBulkMovePayload([])).toEqual({ fileIds: [], folderIds: [] });
  });
});
