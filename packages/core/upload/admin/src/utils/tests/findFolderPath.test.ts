import { findFolderPath } from '../findFolderPath';

import type { FolderNode } from '../../../../shared/contracts/folders';

const tree: FolderNode[] = [
  {
    id: 1,
    name: 'Blog',
    children: [
      { id: 2, name: '2026', children: [{ id: 3, name: 'October', children: [] }] },
      { id: 4, name: 'Drafts', children: [] },
    ],
  },
  { id: 5, name: 'Products', children: [] },
];

const names = (path: FolderNode[] | null) => path?.map((node) => node.name) ?? null;

describe('findFolderPath', () => {
  it('returns just the folder for a top-level folder', () => {
    expect(names(findFolderPath(tree, 5))).toEqual(['Products']);
  });

  it('returns every ancestor, root first, ending with the folder itself', () => {
    expect(names(findFolderPath(tree, 3))).toEqual(['Blog', '2026', 'October']);
  });

  it('does not include siblings of the ancestors', () => {
    expect(names(findFolderPath(tree, 4))).toEqual(['Blog', 'Drafts']);
  });

  it('returns null when the folder is not in the tree', () => {
    expect(findFolderPath(tree, 99)).toBeNull();
  });

  it('skips id-less wrapper nodes, such as a synthetic root', () => {
    const wrapped: FolderNode[] = [{ name: 'root', children: tree }];

    expect(names(findFolderPath(wrapped, 2))).toEqual(['Blog', '2026']);
  });
});
