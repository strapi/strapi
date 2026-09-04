import { buildSectionTree, countSubtree } from '../lib/buildFolderTree';
import { calculateFolderDropZone, resolveDropTarget } from '../lib/dropProjection';
import { flattenSortableTree as flattenTree, itemId, removeSubtree } from '../lib/flatModel';

import type {
  ContentStructureGroup,
  ContentStructureSection,
} from '../../DataManager/utils/contentStructure';
import type { ContentTypeLink } from '../lib/buildFolderTree';
import type { FlatItem } from '../lib/flatModel';
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

const buildFlat = () => {
  const groups = [
    group({ id: 'a', name: 'A', children: [{ type: 'contentType', uid: uid('x') }] }),
    group({ id: 'b', name: 'B', children: [] }),
  ];
  const tree = buildSectionTree(section(groups), [link('x')], compare);
  return flattenTree(tree, new Set());
};

const overRect = { top: 100, height: 30 };

const TOP_ZONE_Y = 101;
const BOTTOM_ZONE_Y = 125;

const project = (
  flat: FlatItem[],
  activeId: string,
  overId: string,
  options: { offsetX?: number; pointerY?: number } = {}
) => {
  const { offsetX = 0, pointerY } = options;

  return resolveDropTarget(removeSubtree(flat, activeId), {
    activeId,
    overId,
    offsetX,
    ...(pointerY === undefined ? {} : { pointer: { x: 0, y: pointerY }, overRect }),
  });
};

describe('resolveDropTarget — between rows', () => {
  it('reorders a root folder to the top with no horizontal shift', () => {
    const flat = buildFlat();
    const target = project(flat, itemId(flat[2].node), itemId(flat[0].node));

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[0].node), edge: 'top' },
    });
  });

  it('draws the line at the bottom of the last row when dropping at the end', () => {
    const flat = buildFlat();
    const target = project(flat, itemId(flat[0].node), itemId(flat[2].node));

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 1,
      depth: 0,
      line: { anchorId: itemId(flat[2].node), edge: 'bottom' },
    });
  });

  it('nests a folder into an open folder when dragged right onto its child', () => {
    const flat = buildFlat();
    const target = project(flat, itemId(flat[2].node), itemId(flat[1].node), { offsetX: 24 });

    expect(target).toEqual({
      kind: 'insert',
      parentId: 'a',
      index: 0,
      depth: 1,
      line: { anchorId: itemId(flat[1].node), edge: 'top' },
    });
  });

  it('treats a collapsed folder as a sibling boundary (drop stays at root)', () => {
    const groups = [
      group({ id: 'a', name: 'A', children: [{ type: 'contentType', uid: uid('x') }] }),
    ];
    const tree = buildSectionTree(section(groups), [link('x'), link('loose')], compare);

    const flat = flattenTree(tree, new Set(['a']));

    const target = project(flat, itemId(flat[0].node), itemId(flat[1].node));

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 1,
      depth: 0,
      line: { anchorId: itemId(flat[1].node), edge: 'bottom' },
    });
  });

  it('the pointer position decides before/after when hovering a non-folder row', () => {
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
    const flat = flattenTree(tree, new Set());

    const directionBased = project(flat, itemId(flat[0].node), itemId(flat[2].node));
    expect(directionBased).toEqual({
      kind: 'insert',
      parentId: 'p',
      index: 1,
      depth: 1,
      line: { anchorId: itemId(flat[3].node), edge: 'top' },
    });

    const before = project(flat, itemId(flat[0].node), itemId(flat[2].node), {
      pointerY: TOP_ZONE_Y,
    });
    expect(before).toEqual({
      kind: 'insert',
      parentId: 'p',
      index: 0,
      depth: 1,
      line: { anchorId: itemId(flat[2].node), edge: 'top' },
    });
  });
});

describe('resolveDropTarget — a row released over itself is a no-op', () => {
  it('does not unfile a nested content type dropped on itself (top zone, no line)', () => {
    const flat = buildFlat();
    const selfId = itemId(flat[1].node);

    expect(project(flat, selfId, selfId, { pointerY: TOP_ZONE_Y })).toBeNull();
  });

  it('does not unfile a nested content type dropped on itself (bottom zone)', () => {
    const flat = buildFlat();
    const selfId = itemId(flat[1].node);

    expect(project(flat, selfId, selfId, { pointerY: BOTTOM_ZONE_Y })).toBeNull();
  });

  it('does not fabricate a move when a folder is dropped on itself', () => {
    const flat = buildFlat();
    const selfId = itemId(flat[0].node);

    expect(project(flat, selfId, selfId, { pointerY: TOP_ZONE_Y })).toBeNull();
  });
});

describe('resolveDropTarget — root content types have no reorderable slot', () => {
  it('snaps a reorder within the ungrouped block to the boundary above the first root folder', () => {
    const tree = buildSectionTree(
      section([group({ id: 'f', name: 'F', children: [] })]),
      [link('a'), link('b'), link('c')],
      compare
    );
    const flat = flattenTree(tree, new Set());

    const target = project(flat, itemId(flat[2].node), itemId(flat[0].node));

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[3].node), edge: 'top' },
    });
  });

  it('snaps to below the last un-foldered item when there are no root folders', () => {
    const tree = buildSectionTree(section([]), [link('a'), link('b'), link('c')], compare);
    const flat = flattenTree(tree, new Set());

    const target = project(flat, itemId(flat[2].node), itemId(flat[0].node));

    expect(target).toEqual({
      kind: 'insert',
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
    const flat = flattenTree(tree, new Set());

    const target = project(flat, itemId(flat[2].node), itemId(flat[1].node));

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[1].node), edge: 'top' },
    });
  });
});

describe('resolveDropTarget — folder rows (pointer zones)', () => {
  it('drops before a folder from its top zone — line at its top edge, index before it', () => {
    const flat = buildFlat();
    const target = project(flat, itemId(flat[2].node), itemId(flat[0].node), {
      pointerY: TOP_ZONE_Y,
    });

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 0,
      depth: 0,
      line: { anchorId: itemId(flat[0].node), edge: 'top' },
    });
  });

  it('nests from the bottom zone when the folder shows children (no after slot)', () => {
    const flat = buildFlat();
    const target = project(flat, itemId(flat[2].node), itemId(flat[0].node), {
      pointerY: BOTTOM_ZONE_Y,
    });

    expect(target).toEqual({ kind: 'nest', folderId: 'a', depth: 1 });
  });

  it('drops after a collapsed folder from its bottom zone — line at the folder row itself', () => {
    const groups = [
      group({ id: 'a', name: 'A', children: [{ type: 'contentType', uid: uid('x') }] }),
    ];
    const tree = buildSectionTree(section(groups), [link('x'), link('loose')], compare);
    const flat = flattenTree(tree, new Set(['a']));

    const target = project(flat, itemId(flat[0].node), itemId(flat[1].node), {
      pointerY: BOTTOM_ZONE_Y,
    });

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 1,
      depth: 0,
      line: { anchorId: itemId(flat[1].node), edge: 'bottom' },
    });
  });

  it('falls back to a legal shallower slot when the active folder is too tall for the sibling slot', () => {
    const groups = [
      group({ id: 'r', name: 'R', children: [{ type: 'group', id: 's' }] }),
      group({ id: 's', name: 'S', parent: 'r', children: [{ type: 'group', id: 'd' }] }),
      group({ id: 'd', name: 'D', parent: 's', children: [] }),
      group({ id: 'act', name: 'Act', children: [{ type: 'group', id: 'ac' }] }),
      group({ id: 'ac', name: 'Ac', parent: 'act', children: [] }),
    ];
    const tree = buildSectionTree(section(groups), [], compare);
    const flat = flattenTree(tree, new Set());

    const target = project(flat, 'folder:act', 'folder:d', { pointerY: BOTTOM_ZONE_Y });

    expect(target).toEqual({
      kind: 'insert',
      parentId: null,
      index: 1,
      depth: 0,
      line: { anchorId: 'folder:d', edge: 'bottom' },
    });
  });

  it('returns null when a too-tall folder has no legal slot at the boundary', () => {
    const groups = [
      group({
        id: 'p',
        name: 'P',
        children: [
          { type: 'group', id: 'q' },
          { type: 'contentType', uid: uid('c1') },
        ],
      }),
      group({ id: 'q', name: 'Q', parent: 'p', children: [] }),
      group({ id: 't1', name: 'T1', children: [{ type: 'group', id: 't2' }] }),
      group({ id: 't2', name: 'T2', parent: 't1', children: [{ type: 'group', id: 't3' }] }),
      group({ id: 't3', name: 'T3', parent: 't2', children: [] }),
    ];
    const tree = buildSectionTree(section(groups), [link('c1')], compare);
    const flat = flattenTree(tree, new Set());

    expect(project(flat, 'folder:t1', 'folder:q', { pointerY: BOTTOM_ZONE_Y })).toBeNull();
  });
});

describe('countSubtree', () => {
  const uids = (...names: string[]) => new Set(names.map(uid));

  it('counts content types and subfolders across the whole subtree', () => {
    const groups = [
      group({
        id: 'root',
        name: 'Root',
        children: [
          { type: 'contentType', uid: uid('a') },
          { type: 'group', id: 'child' },
        ],
      }),
      group({
        id: 'child',
        name: 'Child',
        parent: 'root',
        children: [
          { type: 'contentType', uid: uid('b') },
          { type: 'contentType', uid: uid('c') },
          { type: 'group', id: 'grandchild' },
        ],
      }),
      group({
        id: 'grandchild',
        name: 'Grandchild',
        parent: 'child',
        children: [{ type: 'contentType', uid: uid('d') }],
      }),
      group({ id: 'other', name: 'Other', children: [{ type: 'contentType', uid: uid('e') }] }),
    ];

    const all = uids('a', 'b', 'c', 'd', 'e');

    expect(countSubtree(section(groups), 'root', all)).toEqual({ contentTypes: 4, subfolders: 2 });
    expect(countSubtree(section(groups), 'child', all)).toEqual({ contentTypes: 3, subfolders: 1 });
    expect(countSubtree(section(groups), 'other', all)).toEqual({ contentTypes: 1, subfolders: 0 });
  });

  it('returns zeros for an empty folder and for an unknown folder id', () => {
    const groups = [group({ id: 'empty', name: 'Empty', children: [] })];

    expect(countSubtree(section(groups), 'empty', uids())).toEqual({
      contentTypes: 0,
      subfolders: 0,
    });
    expect(countSubtree(section(groups), 'nope', uids())).toEqual({
      contentTypes: 0,
      subfolders: 0,
    });
  });

  it('ignores dangling subfolder references', () => {
    const groups = [
      group({
        id: 'root',
        name: 'Root',
        children: [
          { type: 'group', id: 'missing' },
          { type: 'contentType', uid: uid('a') },
        ],
      }),
    ];

    expect(countSubtree(section(groups), 'root', uids('a'))).toEqual({
      contentTypes: 1,
      subfolders: 0,
    });
  });

  it('ignores content-type refs that no longer resolve to an existing content type', () => {
    const groups = [
      group({
        id: 'root',
        name: 'Root',
        children: [
          { type: 'contentType', uid: uid('ghost') },
          { type: 'contentType', uid: uid('real') },
        ],
      }),
    ];

    expect(countSubtree(section(groups), 'root', uids('real'))).toEqual({
      contentTypes: 1,
      subfolders: 0,
    });
  });
});

const folderDropZone = (
  pointerY: number,
  rect: { top: number; height: number },
  hasVisibleChildren: boolean
) => calculateFolderDropZone({ pointerY, itemBoundingBox: rect, hasVisibleChildren });

describe('folderDropZone', () => {
  const rect = { top: 100, height: 30 };

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
    expect(folderDropZone(125, rect, true)).toBe('nest');
  });
});
