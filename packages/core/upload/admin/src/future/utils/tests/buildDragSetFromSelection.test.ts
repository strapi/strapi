import { buildDragSetFromSelection } from '../buildDragSetFromSelection';

describe('buildDragSetFromSelection', () => {
  it('returns an empty set for an empty selection', () => {
    expect(buildDragSetFromSelection(new Set(), new Set(), null)).toEqual([]);
  });

  it('maps selected files to file drag items located in the current folder', () => {
    expect(buildDragSetFromSelection(new Set([10, 20]), new Set(), 7)).toEqual([
      { kind: 'file', id: 10, name: '', folderId: 7 },
      { kind: 'file', id: 20, name: '', folderId: 7 },
    ]);
  });

  it('maps selected folders to folder drag items parented to the current folder', () => {
    expect(buildDragSetFromSelection(new Set(), new Set([3]), 7)).toEqual([
      { kind: 'folder', id: 3, name: '', parentId: 7 },
    ]);
  });

  it('uses null location metadata when the current folder is the root', () => {
    expect(buildDragSetFromSelection(new Set([10]), new Set([3]), null)).toEqual([
      { kind: 'file', id: 10, name: '', folderId: null },
      { kind: 'folder', id: 3, name: '', parentId: null },
    ]);
  });
});
