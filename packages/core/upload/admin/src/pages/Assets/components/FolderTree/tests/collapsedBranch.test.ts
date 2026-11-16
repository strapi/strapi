import { COLLAPSE_FROM_DEPTH, getCollapsedBranch } from '../collapsedBranch';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';

/**
 * Builds a single chain `F0 > F1 > … > F{depth}` with ids 100, 101, … so the
 * folder at depth `d` has id `100 + d`. Each level also gets a sibling (id
 * 200 + d) so tests can check that off-path folders are never picked up.
 */
const buildChain = (depth: number): FolderNode[] => {
  let level: FolderNode[] = [];

  for (let d = depth; d >= 0; d -= 1) {
    level = [
      { id: 100 + d, name: `F${d}`, children: level },
      { id: 200 + d, name: `Sibling${d}`, children: [] },
    ];
  }

  return level;
};

const ids = (nodes: FolderNode[]) => nodes.map((node) => node.id);

describe('getCollapsedBranch', () => {
  it('collapses from depth 4', () => {
    expect(COLLAPSE_FROM_DEPTH).toBe(4);
  });

  it('returns null while the selected folder is shallower than the threshold', () => {
    expect(getCollapsedBranch(buildChain(5), 103)).toBeNull();
  });

  it('returns null at the root, and for an unknown or missing selection', () => {
    expect(getCollapsedBranch(buildChain(5), 100)).toBeNull();
    expect(getCollapsedBranch(buildChain(5), 999)).toBeNull();
    expect(getCollapsedBranch(buildChain(5), null)).toBeNull();
  });

  it('hides d - 2 ancestors at the threshold depth', () => {
    const branch = getCollapsedBranch(buildChain(5), 104)!;

    expect(branch.root.id).toBe(100);
    expect(ids(branch.hidden)).toEqual([101, 102]);
    expect(branch.parent.id).toBe(103);
  });

  it('orders hidden ancestors from shallowest to deepest', () => {
    const branch = getCollapsedBranch(buildChain(11), 111)!;

    expect(branch.root.id).toBe(100);
    expect(ids(branch.hidden)).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 109]);
    expect(branch.parent.id).toBe(110);
  });

  it('collapses for an off-path sibling deep enough in the tree', () => {
    // Sibling5 sits under F4, so it is at depth 5 like F5.
    const branch = getCollapsedBranch(buildChain(5), 205)!;

    expect(ids(branch.hidden)).toEqual([101, 102, 103]);
    expect(branch.parent.id).toBe(104);
  });
});
