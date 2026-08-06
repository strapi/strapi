import { buildSectionTree } from '../lib/buildFolderTree';
import {
  calculateFolderDropZone,
  folderSiblingDropTarget,
  getDropTarget,
} from '../lib/dropProjection';
import { flattenSortableTree as flattenTree, itemId } from '../lib/flatModel';

import type {
  ContentStructureGroup,
  ContentStructureSection,
} from '../../DataManager/utils/contentStructure';
import type { ContentTypeLink } from '../lib/buildFolderTree';
import type { UID } from '@strapi/types';

const uid = (name: string) => `api::${name}.${name}` as UID.ContentType;

const link = (name: string): ContentTypeLink => ({
  uid: uid(name),
  to: `/x/${name}`,
  title: name,
  status: 'UNCHANGED',
});

const group = (overrides: Partial<ContentStructureGroup> & { id: string }): ContentStructureGroup =>
  ({
    name: overrides.id,
    parent: null,
    children: [],
    status: 'UNCHANGED',
    ...overrides,
  }) as ContentStructureGroup;

const section = (groups: ContentStructureGroup[]): ContentStructureSection => ({ groups });

const compare = (a: string, b: string) => a.localeCompare(b);

// A: { x }, then B — flattens to [A(0), x(1), B(0)].
const buildFlat = () => {
  const groups = [
    group({ id: 'a', name: 'A', children: [{ type: 'contentType', uid: uid('x') }] }),
    group({ id: 'b', name: 'B', children: [] }),
  ];
  const tree = buildSectionTree(section(groups), [link('x')], compare);
  return flattenTree(tree, new Set());
};

describe('getDropTarget', () => {
  it('reorders a root folder to the top with no horizontal shift', () => {
    const flat = buildFlat(); // [A, x, B]
    const target = getDropTarget(flat, itemId(flat[2].node), itemId(flat[0].node), 0);

    // Dropping B above A → line at the top edge of A, at root depth.
    expect(target).toEqual({
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[0].node), edge: 'top' },
    });
  });

  it('draws the line at the bottom of the last row when dropping at the end', () => {
    const flat = buildFlat(); // [A, x, B]
    // Drag A to the very end (onto B, no horizontal shift) → after B at root.
    const target = getDropTarget(flat, itemId(flat[0].node), itemId(flat[2].node), 0);

    expect(target).toEqual({
      parentId: null,
      index: 1,
      depth: 0,
      line: { anchorId: itemId(flat[2].node), edge: 'bottom' },
    });
  });

  it('nests a folder into an open folder when dragged right onto its child', () => {
    const flat = buildFlat();
    // Drag B (root) onto x (child of A) nudged one level right → into A.
    const target = getDropTarget(flat, itemId(flat[2].node), itemId(flat[1].node), 24);

    expect(target?.parentId).toBe('a');
    // The line sits at the top of x (B becomes A's first child, above x), indented one level.
    expect(target?.depth).toBe(1);
    expect(target?.line).toEqual({ anchorId: itemId(flat[1].node), edge: 'top' });
  });

  it('treats a collapsed folder as a sibling boundary (drop stays at root)', () => {
    const groups = [
      group({ id: 'a', name: 'A', children: [{ type: 'contentType', uid: uid('x') }] }),
    ];
    const tree = buildSectionTree(section(groups), [link('x'), link('loose')], compare);
    // Collapse A so its child is hidden: flattens to [loose(0), A(0)].
    const flat = flattenTree(tree, new Set(['a']));

    const target = getDropTarget(flat, itemId(flat[0].node), itemId(flat[1].node), 0);

    expect(target?.parentId).toBeNull();
  });

  it('the `side` argument overrides drag direction (pointer decides before/after)', () => {
    const groups = [
      group({
        id: 'p',
        name: 'P',
        children: [
          { type: 'contentType', uid: uid('c1') },
          { type: 'contentType', uid: uid('c2') },
        ],
      }),
    ];
    const tree = buildSectionTree(section(groups), [link('c1'), link('c2'), link('top')], compare);
    const flat = flattenTree(tree, new Set()); // [top(0), P(1), c1(2), c2(3)]

    // `top` starts ABOVE c1, so the direction-based (no-side) placement lands it
    // AFTER c1 — the line sits at the top of c2.
    const directionBased = getDropTarget(flat, itemId(flat[0].node), itemId(flat[2].node), 0);
    expect(directionBased?.line).toEqual({ anchorId: itemId(flat[3].node), edge: 'top' });

    // With side='before' the line sits above c1 regardless of where the drag
    // started — this is what makes the "between a folder and its first child"
    // slot reachable when dragging downward.
    const before = getDropTarget(flat, itemId(flat[0].node), itemId(flat[2].node), 0, 'before');
    expect(before?.line).toEqual({ anchorId: itemId(flat[2].node), edge: 'top' });
  });
});

describe('getDropTarget — root content types have no reorderable slot', () => {
  // Root layout is [...ungrouped content types (alphabetical), ...root folders],
  // and root content-type order is never stored, so a drop among the ungrouped
  // block snaps to the one real root position: below the last un-foldered item.
  it('snaps a reorder within the ungrouped block to the boundary above the first root folder', () => {
    const tree = buildSectionTree(
      section([group({ id: 'f', name: 'F', children: [] })]),
      [link('a'), link('b'), link('c')],
      compare
    );
    const flat = flattenTree(tree, new Set()); // [a(0), b(0), c(0), F(0)]

    // Drag c up between a and b — a content-type reorder, which isn't persisted.
    const target = getDropTarget(flat, itemId(flat[2].node), itemId(flat[0].node), 0);

    // Snaps to the boundary: line at the first root folder's top edge.
    expect(target).toEqual({
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[3].node), edge: 'top' },
    });
  });

  it('snaps to below the last un-foldered item when there are no root folders', () => {
    const tree = buildSectionTree(section([]), [link('a'), link('b'), link('c')], compare);
    const flat = flattenTree(tree, new Set()); // [a(0), b(0), c(0)]

    // Drag c up between a and b; with no folders the boundary is below the last
    // un-foldered item once the dragged row (c) is excluded — i.e. b's bottom.
    const target = getDropTarget(flat, itemId(flat[2].node), itemId(flat[0].node), 0);

    expect(target).toEqual({
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[1].node), edge: 'bottom' },
    });
  });

  it('leaves folder↔folder reordering untouched (its line points at a folder)', () => {
    const tree = buildSectionTree(
      section([
        group({ id: 'f', name: 'F', children: [] }),
        group({ id: 'g', name: 'G', children: [] }),
      ]),
      [link('a')],
      compare
    );
    const flat = flattenTree(tree, new Set()); // [a(0), F(0), G(0)]

    // Drag G above F — a real, persisted folder reorder. The line stays on F.
    const target = getDropTarget(flat, itemId(flat[2].node), itemId(flat[1].node), 0);

    expect(target).toEqual({
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[1].node), edge: 'top' },
    });
  });
});

describe('folderSiblingDropTarget', () => {
  it('drops before a folder (top third) — line at its top edge, index before it', () => {
    const flat = buildFlat(); // [A, x, B]
    const target = folderSiblingDropTarget(
      flat,
      itemId(flat[2].node),
      itemId(flat[0].node),
      'before'
    );

    expect(target).toEqual({
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[0].node), edge: 'top' },
    });
  });

  it('drops after an open folder (bottom third) — line below its whole subtree', () => {
    const flat = buildFlat(); // [A, x, B]; A is open with child x
    const target = folderSiblingDropTarget(
      flat,
      itemId(flat[2].node),
      itemId(flat[0].node),
      'after'
    );

    // B lands after A at the root, and the line sits at the bottom of x (A's last
    // visible descendant) so it reads as "below the folder", not inside it.
    expect(target).toEqual({
      parentId: null,
      index: 1,
      depth: 0,
      line: { anchorId: itemId(flat[1].node), edge: 'bottom' },
    });
  });

  it('drops after a collapsed folder — line at the folder row itself', () => {
    const groups = [
      group({ id: 'a', name: 'A', children: [{ type: 'contentType', uid: uid('x') }] }),
    ];
    const tree = buildSectionTree(section(groups), [link('x'), link('loose')], compare);
    const flat = flattenTree(tree, new Set(['a'])); // [loose(0), A(0)] — A closed

    const target = folderSiblingDropTarget(
      flat,
      itemId(flat[0].node),
      itemId(flat[1].node),
      'after'
    );

    expect(target).toEqual({
      parentId: null,
      index: 1,
      depth: 0,
      line: { anchorId: itemId(flat[1].node), edge: 'bottom' },
    });
  });

  it('returns null when an active folder is too tall to sit at the target depth', () => {
    // Target D is at render depth 2 (the deepest a folder can be); the active
    // folder is two levels tall, so a sibling of D would breach MAX_FOLDER_DEPTH.
    const groups = [
      group({ id: 'r', name: 'R', children: [{ type: 'group', id: 's' }] }),
      group({ id: 's', name: 'S', parent: 'r', children: [{ type: 'group', id: 'd' }] }),
      group({ id: 'd', name: 'D', parent: 's', children: [] }),
      group({ id: 'act', name: 'Act', children: [{ type: 'group', id: 'ac' }] }),
      group({ id: 'ac', name: 'Ac', parent: 'act', children: [] }),
    ];
    const tree = buildSectionTree(section(groups), [], compare);
    const flat = flattenTree(tree, new Set()); // [R, S, D, Act, Ac]

    expect(folderSiblingDropTarget(flat, 'folder:act', 'folder:d', 'after')).toBeNull();
  });
});

const folderDropZone = (
  pointerY: number,
  rect: { top: number; height: number },
  hasVisibleChildren: boolean
) => calculateFolderDropZone({ pointerY, itemBoundingBox: rect, hasVisibleChildren });

describe('folderDropZone', () => {
  const rect = { top: 100, height: 30 }; // thirds split at y=110 and y=120

  it('is "before" in the top third, whatever the folder holds', () => {
    expect(folderDropZone(105, rect, false)).toBe('before');
    expect(folderDropZone(105, rect, true)).toBe('before');
  });

  it('is "nest" in the middle third', () => {
    expect(folderDropZone(115, rect, false)).toBe('nest');
    expect(folderDropZone(115, rect, true)).toBe('nest');
  });

  it('is "after" in the bottom third when the folder shows no children', () => {
    expect(folderDropZone(125, rect, false)).toBe('after');
  });

  it('nests in the bottom third when the folder is showing children (no "after" blip)', () => {
    // Regression: an expanded folder must not offer "after the whole subtree" at
    // its header — that fought the first child's "before" zone at the same
    // boundary and made the indicator oscillate between the two positions.
    expect(folderDropZone(125, rect, true)).toBe('nest');
  });
});
