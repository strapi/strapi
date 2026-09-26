import { emptyItemLocations, type ItemLocations } from '../../../../../utils/itemLocations';
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

/** Minimal stand-in for a loaded list: only the ids given are known. */
const locationsOf = (
  files: Record<number, number | null>,
  folders: Record<number, number | null>
): ItemLocations => ({
  fileFolderId: (id) => (id in files ? files[id] : undefined),
  folderParentId: (id) => (id in folders ? folders[id] : undefined),
});

describe('buildDragSet', () => {
  it('returns only the active item, with its own location, when nothing is selected', () => {
    const active = file(10, 5);

    expect(buildDragSet(active, undefined, emptyItemLocations, 99)).toEqual({
      items: [{ kind: 'file', id: 10, name: 'file-10.png', folderId: 5 }],
      fromSelection: false,
      activeSourceFolderId: 5,
      spansMultipleSources: false,
    });
    expect(buildDragSet(active, new Set(), emptyItemLocations, 99)).toEqual({
      items: [{ kind: 'file', id: 10, name: 'file-10.png', folderId: 5 }],
      fromSelection: false,
      activeSourceFolderId: 5,
      spansMultipleSources: false,
    });
  });

  it('returns only the active item when it is not in the selection', () => {
    const active = file(10, 5);
    const selectedKeys = new Set([assetKey(20), folderKey(3)]);

    expect(buildDragSet(active, selectedKeys, emptyItemLocations, 99)).toEqual({
      items: [{ kind: 'file', id: 10, name: 'file-10.png', folderId: 5 }],
      fromSelection: false,
      activeSourceFolderId: 5,
      spansMultipleSources: false,
    });
  });

  it('trusts the dragged row over the folder currently open', () => {
    // The row the drag started from carries the populated parent, so a folder
    // grabbed out of a global search keeps its real parent.
    const active = folder(3, 4);

    expect(buildDragSet(active, undefined, emptyItemLocations, null)).toEqual({
      items: [{ kind: 'folder', id: 3, name: 'folder-3', parentId: 4 }],
      fromSelection: false,
      // The folder's parent, not its own id.
      activeSourceFolderId: 4,
      spansMultipleSources: false,
    });
  });

  it('resolves the rest of the selection from the loaded rows', () => {
    const active = file(10, 5);
    const selectedKeys = new Set([assetKey(10), assetKey(20), folderKey(3)]);
    const locations = locationsOf({ 10: 5, 20: null }, { 3: 8 });

    const result = buildDragSet(active, selectedKeys, locations, 99);

    expect(result.fromSelection).toBe(true);
    expect(result.items).toEqual(
      expect.arrayContaining([
        { kind: 'file', id: 10, name: 'file-10.png', folderId: 5 },
        { kind: 'file', id: 20, name: '', folderId: null },
        { kind: 'folder', id: 3, name: '', parentId: 8 },
      ])
    );
    expect(result.items).toHaveLength(3);
  });

  it('falls back to the current folder for selected ids that are not loaded', () => {
    const active = folder(3, 8);
    const selectedKeys = new Set([folderKey(3), assetKey(10)]);

    const result = buildDragSet(active, selectedKeys, emptyItemLocations, 8);

    expect(result.fromSelection).toBe(true);
    expect(result.items).toEqual(
      expect.arrayContaining([
        { kind: 'folder', id: 3, name: 'folder-3', parentId: 8 },
        { kind: 'file', id: 10, name: '', folderId: 8 },
      ])
    );
    expect(result.items).toHaveLength(2);
  });

  it('keeps a mixed selection at its real locations rather than collapsing it to one folder', () => {
    const active = folder(3, null);
    const selectedKeys = new Set([folderKey(3), assetKey(10)]);
    const locations = locationsOf({ 10: 2 }, { 3: null });

    const result = buildDragSet(active, selectedKeys, locations, 2);

    expect(result.items).toEqual(
      expect.arrayContaining([
        { kind: 'folder', id: 3, name: 'folder-3', parentId: null },
        { kind: 'file', id: 10, name: '', folderId: 2 },
      ])
    );
  });

  describe('naming the source of the move', () => {
    it('names the grabbed row, not the first one clicked', () => {
      // Search from the root, click asset 10 in folder 4 first, then asset 20 in
      // folder 5, and drag 20. Selection order puts 10 first in `items`, so
      // reading the source off `items[0]` would credit folder 4 — a folder the
      // user never dragged from.
      const selectedKeys = new Set([assetKey(10), assetKey(20)]);
      const locations = locationsOf({ 10: 4, 20: 5 }, {});

      const result = buildDragSet(file(20, 5), selectedKeys, locations, null);

      expect(result.items[0]).toMatchObject({ id: 10, folderId: 4 });
      expect(result.activeSourceFolderId).toBe(5);
      expect(result.spansMultipleSources).toBe(true);
    });

    it('reports the same spanning set the same way whichever row is grabbed', () => {
      const selectedKeys = new Set([assetKey(10), assetKey(20)]);
      const locations = locationsOf({ 10: 4, 20: 5 }, {});

      const result = buildDragSet(file(10, 4), selectedKeys, locations, null);

      expect(result.activeSourceFolderId).toBe(4);
      expect(result.spansMultipleSources).toBe(true);
    });

    it('does not flag a selection that all sits in one folder', () => {
      const selectedKeys = new Set([assetKey(10), assetKey(20), folderKey(3)]);
      // The folder's parent and the files' folder are all 4 — one true source.
      const locations = locationsOf({ 10: 4, 20: 4 }, { 3: 4 });

      const result = buildDragSet(file(10, 4), selectedKeys, locations, null);

      expect(result.activeSourceFolderId).toBe(4);
      expect(result.spansMultipleSources).toBe(false);
    });

    it('treats the root as a source distinct from any folder', () => {
      const selectedKeys = new Set([assetKey(10), assetKey(20)]);
      const locations = locationsOf({ 10: null, 20: 5 }, {});

      const result = buildDragSet(file(20, 5), selectedKeys, locations, null);

      expect(result.spansMultipleSources).toBe(true);
    });

    it('does not flag a selection that all sits at the root', () => {
      const selectedKeys = new Set([assetKey(10), assetKey(20)]);
      const locations = locationsOf({ 10: null, 20: null }, {});

      const result = buildDragSet(file(10, null), selectedKeys, locations, 7);

      expect(result.activeSourceFolderId).toBeNull();
      expect(result.spansMultipleSources).toBe(false);
    });

    it('does not flag unloaded rows that the fallback lands on the grabbed folder', () => {
      const selectedKeys = new Set([assetKey(10), assetKey(20)]);

      const result = buildDragSet(file(10, 8), selectedKeys, emptyItemLocations, 8);

      expect(result.activeSourceFolderId).toBe(8);
      expect(result.spansMultipleSources).toBe(false);
    });
  });
});
