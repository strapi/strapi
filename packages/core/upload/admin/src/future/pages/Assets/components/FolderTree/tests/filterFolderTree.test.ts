import { filterFolderTree } from '../filterFolderTree';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';

const structure: FolderNode[] = [
  {
    id: 1,
    name: 'Top A',
    children: [
      {
        id: 2,
        name: 'Inner A1',
        children: [{ id: 3, name: 'Leaf A1a', children: [] }],
      },
      { id: 4, name: 'Inner A2', children: [] },
    ],
  },
  { id: 5, name: 'Top B', children: [] },
];

const matching = (needle: string) => (name: string) => name.includes(needle);

describe('filterFolderTree', () => {
  it('keeps a matching root node and drops the rest', () => {
    const { nodes } = filterFolderTree(structure, matching('Top B'));

    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('Top B');
  });

  it('keeps a matching root node with its whole subtree pruned away', () => {
    const { nodes } = filterFolderTree(structure, matching('Top A'));

    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('Top A');
    expect(nodes[0].children).toHaveLength(0);
  });

  it('retains the ancestor chain of a match nested two levels deep', () => {
    const { nodes } = filterFolderTree(structure, matching('Leaf A1a'));

    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('Top A');
    expect(nodes[0].children).toHaveLength(1);
    expect(nodes[0].children[0].name).toBe('Inner A1');
    expect(nodes[0].children[0].children[0].name).toBe('Leaf A1a');
  });

  it('drops non-matching siblings of a retained branch', () => {
    const { nodes } = filterFolderTree(structure, matching('Leaf A1a'));

    expect(nodes[0].children.map(({ name }) => name)).not.toContain('Inner A2');
    expect(nodes.map(({ name }) => name)).not.toContain('Top B');
  });

  it('reports exactly the ancestors that need force-expanding', () => {
    const { expandedIds } = filterFolderTree(structure, matching('Leaf A1a'));

    expect(expandedIds.sort()).toEqual([1, 2]);
  });

  it('does not force-expand a leaf match', () => {
    const { expandedIds } = filterFolderTree(structure, matching('Top B'));

    expect(expandedIds).toEqual([]);
  });

  it('returns nothing when no node matches', () => {
    const { nodes, expandedIds } = filterFolderTree(structure, matching('nope'));

    expect(nodes).toEqual([]);
    expect(expandedIds).toEqual([]);
  });

  it('keeps every node when the predicate matches everything', () => {
    const { nodes } = filterFolderTree(structure, () => true);

    expect(nodes.map(({ name }) => name)).toEqual(['Top A', 'Top B']);
    expect(nodes[0].children.map(({ name }) => name)).toEqual(['Inner A1', 'Inner A2']);
  });

  it('does not mutate the input tree', () => {
    const snapshot = JSON.stringify(structure);

    filterFolderTree(structure, matching('Leaf A1a'));

    expect(JSON.stringify(structure)).toBe(snapshot);
  });

  it('tolerates nodes without a name or children', () => {
    const sparse: FolderNode[] = [{ id: 9 } as FolderNode];

    expect(filterFolderTree(sparse, matching('anything')).nodes).toEqual([]);
    expect(filterFolderTree(sparse, () => true).nodes).toEqual([{ id: 9, children: [] }]);
  });
});
