import { assetKey, folderKey } from '../../../utils/selection';
import { buildDragSet } from '../buildDragSet';

import type { DragItemData } from '../../../../../types/dnd';

const file = (id: number, folderId: number | null = 1): DragItemData => ({
  kind: 'file',
  id,
  name: `file-${id}.png`,
  folderId,
});

const folder = (id: number, parentId: number | null = 1): DragItemData => ({
  kind: 'folder',
  id,
  name: `folder-${id}`,
  parentId,
});

describe('buildDragSet', () => {
  it('returns only the active item when nothing is selected', () => {
    const active = file(10);

    expect(buildDragSet(active, undefined)).toEqual({
      items: [active],
      fromSelection: false,
    });
    expect(buildDragSet(active, new Set())).toEqual({
      items: [active],
      fromSelection: false,
    });
  });

  it('returns only the active item when it is not in the selection', () => {
    const active = file(10);
    const selectedKeys = new Set([assetKey(20), folderKey(3)]);

    expect(buildDragSet(active, selectedKeys)).toEqual({
      items: [active],
      fromSelection: false,
    });
  });

  it('returns the full selection when dragging a selected file', () => {
    const active = file(10, 5);
    const selectedKeys = new Set([assetKey(10), assetKey(20), folderKey(3)]);

    const result = buildDragSet(active, selectedKeys);

    expect(result.fromSelection).toBe(true);
    expect(result.items).toEqual(
      expect.arrayContaining([
        { kind: 'file', id: 10, name: 'file-10.png', folderId: 5 },
        { kind: 'file', id: 20, name: '', folderId: 5 },
        { kind: 'folder', id: 3, name: '', parentId: 5 },
      ])
    );
    expect(result.items).toHaveLength(3);
  });

  it('returns the full selection when dragging a selected folder', () => {
    const active = folder(3, null);
    const selectedKeys = new Set([folderKey(3), assetKey(10)]);

    const result = buildDragSet(active, selectedKeys);

    expect(result.fromSelection).toBe(true);
    expect(result.items).toEqual(
      expect.arrayContaining([
        { kind: 'folder', id: 3, name: 'folder-3', parentId: null },
        { kind: 'file', id: 10, name: '', folderId: null },
      ])
    );
  });
});
