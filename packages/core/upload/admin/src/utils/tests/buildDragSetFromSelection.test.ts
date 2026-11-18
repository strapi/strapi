import { buildDragSetFromSelection } from '../buildDragSetFromSelection';
import { emptyItemLocations, type ItemLocations } from '../itemLocations';

/** Minimal stand-in for a loaded list: only the ids given are known. */
const locationsOf = (
  files: Record<number, number | null>,
  folders: Record<number, number | null>
): ItemLocations => ({
  fileFolderId: (id) => (id in files ? files[id] : undefined),
  folderParentId: (id) => (id in folders ? folders[id] : undefined),
});

describe('buildDragSetFromSelection', () => {
  it('returns an empty set for an empty selection', () => {
    expect(buildDragSetFromSelection(new Set(), new Set(), emptyItemLocations, null)).toEqual([]);
  });

  it('locates each selected item from the loaded rows', () => {
    const locations = locationsOf({ 10: 4, 20: null }, { 3: 8 });

    expect(buildDragSetFromSelection(new Set([10, 20]), new Set([3]), locations, null)).toEqual([
      { kind: 'file', id: 10, name: '', folderId: 4 },
      { kind: 'file', id: 20, name: '', folderId: null },
      { kind: 'folder', id: 3, name: '', parentId: 8 },
    ]);
  });

  it('keeps a nested folder nested when it was found by a search from the root', () => {
    // The reviewer's case: `?folder=` is the root, but the hit lives under 4.
    // Stamping the current folder would report it as already at root and hide
    // the Media Library destination.
    const locations = locationsOf({}, { 3: 4 });

    expect(buildDragSetFromSelection(new Set(), new Set([3]), locations, null)).toEqual([
      { kind: 'folder', id: 3, name: '', parentId: 4 },
    ]);
  });

  it('keeps a root-level folder at root when it was found from inside a folder', () => {
    // The mirror case: searching from inside folder 9 must not make a
    // root-level hit look nested (and offer a no-op move to root).
    const locations = locationsOf({}, { 3: null });

    expect(buildDragSetFromSelection(new Set(), new Set([3]), locations, 9)).toEqual([
      { kind: 'folder', id: 3, name: '', parentId: null },
    ]);
  });

  it('falls back to the current folder for an id that is not in the loaded lists', () => {
    expect(buildDragSetFromSelection(new Set([10]), new Set([3]), emptyItemLocations, 7)).toEqual([
      { kind: 'file', id: 10, name: '', folderId: 7 },
      { kind: 'folder', id: 3, name: '', parentId: 7 },
    ]);
  });
});
