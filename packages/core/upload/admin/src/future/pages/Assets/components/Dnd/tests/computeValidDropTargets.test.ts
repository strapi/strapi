import { computeValidDropTargets } from '../computeValidDropTargets';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';
import type { DragItemData } from '../../../../../types/dnd';

const folderStructure: FolderNode[] = [
  {
    id: 1,
    name: 'Marketing',
    children: [{ id: 2, name: '2023', children: [] }],
  },
  { id: 5, name: 'Sibling', children: [] },
];

describe('computeValidDropTargets', () => {
  it('returns an empty set when there are no drag items', () => {
    expect(computeValidDropTargets([], folderStructure).size).toBe(0);
  });

  it('marks Home and unrelated folders valid for a nested file', () => {
    const items: DragItemData[] = [{ kind: 'file', id: 10, name: 'hero.png', folderId: 2 }];

    const valid = computeValidDropTargets(items, folderStructure);

    expect(valid.has(null)).toBe(true);
    expect(valid.has(1)).toBe(true);
    expect(valid.has(5)).toBe(true);
    expect(valid.has(2)).toBe(false);
  });

  it('rejects self and descendant targets for a dragged folder', () => {
    const items: DragItemData[] = [{ kind: 'folder', id: 1, name: 'Marketing', parentId: null }];

    const valid = computeValidDropTargets(items, folderStructure);

    expect(valid.has(1)).toBe(false);
    expect(valid.has(2)).toBe(false);
    expect(valid.has(5)).toBe(true);
    expect(valid.has(null)).toBe(false);
  });

  it('requires every item in a mixed set to accept the destination', () => {
    const items: DragItemData[] = [
      { kind: 'file', id: 10, name: 'hero.png', folderId: 5 },
      { kind: 'folder', id: 1, name: 'Marketing', parentId: null },
    ];

    const valid = computeValidDropTargets(items, folderStructure);

    // File can go to 2, but folder 1 cannot drop onto descendant 2.
    expect(valid.has(2)).toBe(false);
    // Home is allowed when any item is not already at root (the file).
    expect(valid.has(null)).toBe(true);
    // File already lives in Sibling — same-folder rule rejects 5 for the set.
    expect(valid.has(5)).toBe(false);
  });
});
