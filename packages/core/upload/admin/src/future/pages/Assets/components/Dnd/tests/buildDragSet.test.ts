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
  it('returns only the active item when nothing is selected, stamped with the current folder', () => {
    const active = file(10);

    expect(buildDragSet(active, undefined, 5)).toEqual({
      items: [{ kind: 'file', id: 10, name: 'file-10.png', folderId: 5 }],
      fromSelection: false,
    });
    expect(buildDragSet(active, new Set(), 5)).toEqual({
      items: [{ kind: 'file', id: 10, name: 'file-10.png', folderId: 5 }],
      fromSelection: false,
    });
  });

  it('returns only the active item when it is not in the selection, stamped with the current folder', () => {
    const active = file(10);
    const selectedKeys = new Set([assetKey(20), folderKey(3)]);

    expect(buildDragSet(active, selectedKeys, 5)).toEqual({
      items: [{ kind: 'file', id: 10, name: 'file-10.png', folderId: 5 }],
      fromSelection: false,
    });
  });

  it('stamps a single dragged folder with the current folder, ignoring its unpopulated parentId', () => {
    // A folder's `parent` is not populated by the folders query, so its own
    // `parentId` is unreliable (collapses to null). The current folder wins.
    const active = folder(3, null);

    expect(buildDragSet(active, undefined, 7)).toEqual({
      items: [{ kind: 'folder', id: 3, name: 'folder-3', parentId: 7 }],
      fromSelection: false,
    });
  });

  it('returns the full selection when dragging a selected file, stamped with the current folder', () => {
    const active = file(10, 5);
    const selectedKeys = new Set([assetKey(10), assetKey(20), folderKey(3)]);

    const result = buildDragSet(active, selectedKeys, 5);

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

  it('stamps the whole selection with the current folder when the active item is a folder with an unpopulated parent', () => {
    // Reproduces the "select-all with at least one folder" case: grabbing a
    // folder tile whose `parentId` is null must not collapse the set to root.
    const active = folder(3, null);
    const selectedKeys = new Set([folderKey(3), assetKey(10)]);

    const result = buildDragSet(active, selectedKeys, 8);

    expect(result.fromSelection).toBe(true);
    expect(result.items).toEqual(
      expect.arrayContaining([
        { kind: 'folder', id: 3, name: 'folder-3', parentId: 8 },
        { kind: 'file', id: 10, name: '', folderId: 8 },
      ])
    );
    expect(result.items).toHaveLength(2);
  });

  it('stamps items with null when the current folder is root', () => {
    const active = folder(3, 2);
    const selectedKeys = new Set([folderKey(3), assetKey(10)]);

    const result = buildDragSet(active, selectedKeys, null);

    expect(result.items).toEqual(
      expect.arrayContaining([
        { kind: 'folder', id: 3, name: 'folder-3', parentId: null },
        { kind: 'file', id: 10, name: '', folderId: null },
      ])
    );
  });
});
