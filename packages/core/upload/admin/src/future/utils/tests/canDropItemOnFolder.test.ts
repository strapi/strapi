import { canDropItemOnFolder, isFolderDescendantOf } from '../canDropItemOnFolder';

import type { FolderNode } from '../../../../../shared/contracts/folders';
import type { DragItemData } from '../../types/dnd';

const folderStructure: FolderNode[] = [
  {
    id: 1,
    name: 'Marketing',
    children: [
      {
        id: 2,
        name: '2023',
        children: [
          { id: 3, name: 'Used', children: [] },
          { id: 4, name: 'Archive', children: [] },
        ],
      },
    ],
  },
  { id: 5, name: 'Sibling', children: [] },
];

describe('isFolderDescendantOf', () => {
  it('returns true when candidate is the ancestor itself', () => {
    expect(isFolderDescendantOf(folderStructure, 2, 2)).toBe(true);
  });

  it('returns true for nested descendants', () => {
    expect(isFolderDescendantOf(folderStructure, 2, 3)).toBe(true);
  });

  it('returns false for siblings and unrelated folders', () => {
    expect(isFolderDescendantOf(folderStructure, 2, 5)).toBe(false);
    expect(isFolderDescendantOf(folderStructure, 1, 5)).toBe(false);
  });
});

describe('canDropItemOnFolder', () => {
  const fileItem: DragItemData = {
    kind: 'file',
    id: 10,
    name: 'hero.png',
    folderId: 5,
  };

  it('allows moving a file into a different folder', () => {
    expect(
      canDropItemOnFolder({
        items: [fileItem],
        targetFolderId: 2,
        folderStructure,
      })
    ).toBe(true);
  });

  it('blocks dropping a folder onto itself', () => {
    expect(
      canDropItemOnFolder({
        items: [{ kind: 'folder', id: 2, name: '2023', parentId: 1 }],
        targetFolderId: 2,
        folderStructure,
      })
    ).toBe(false);
  });

  it('blocks dropping a folder onto a descendant', () => {
    expect(
      canDropItemOnFolder({
        items: [{ kind: 'folder', id: 2, name: '2023', parentId: 1 }],
        targetFolderId: 3,
        folderStructure,
      })
    ).toBe(false);
  });

  it('blocks moving a file that is already in the target folder', () => {
    expect(
      canDropItemOnFolder({
        items: [{ kind: 'file', id: 10, name: 'hero.png', folderId: 2 }],
        targetFolderId: 2,
        folderStructure,
      })
    ).toBe(false);
  });

  it('blocks when the target folder is part of the drag payload', () => {
    expect(
      canDropItemOnFolder({
        items: [
          { kind: 'folder', id: 5, name: 'Sibling', parentId: null },
          { kind: 'file', id: 11, name: 'doc.pdf', folderId: null },
        ],
        targetFolderId: 5,
        folderStructure,
      })
    ).toBe(false);
  });

  it('returns false for an empty payload', () => {
    expect(
      canDropItemOnFolder({
        items: [],
        targetFolderId: 2,
        folderStructure,
      })
    ).toBe(false);
  });
});
