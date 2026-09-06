import { flattenFolderStructure } from '../flattenFolderStructure';

import type { FolderNode } from '../../../../../shared/contracts/folders';

const structure: FolderNode[] = [
  {
    id: 1,
    name: 'About',
    children: [{ id: 2, name: 'Images', children: [] }],
  },
  {
    id: 3,
    name: 'Tech',
    children: [
      {
        id: 4,
        name: 'Images',
        children: [{ id: 5, name: 'Logos', children: [] }],
      },
    ],
  },
];

describe('flattenFolderStructure', () => {
  it('flattens depth-first with full ancestry labels', () => {
    expect(flattenFolderStructure(structure)).toEqual([
      { id: 1, label: 'About' },
      { id: 2, label: 'About / Images' },
      { id: 3, label: 'Tech' },
      { id: 4, label: 'Tech / Images' },
      { id: 5, label: 'Tech / Images / Logos' },
    ]);
  });

  it('skips nodes without an id but keeps their children unreachable', () => {
    const withNullId: FolderNode[] = [{ id: undefined, name: 'ghost', children: [] }];
    expect(flattenFolderStructure(withNullId)).toEqual([]);
  });

  it('returns an empty list for an empty structure', () => {
    expect(flattenFolderStructure([])).toEqual([]);
  });

  it('prunes excluded folders and their whole subtree in the same pass', () => {
    expect(flattenFolderStructure(structure, new Set([4]))).toEqual([
      { id: 1, label: 'About' },
      { id: 2, label: 'About / Images' },
      { id: 3, label: 'Tech' },
      // 4 (Tech / Images) and its child 5 (Logos) are gone.
    ]);
  });
});
