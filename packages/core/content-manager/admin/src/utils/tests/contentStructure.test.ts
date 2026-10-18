import { countTreeLinks, deriveVisibleTree, flattenTreeLinks } from '../contentStructure';

import type { Modules } from '@strapi/types';

interface Link {
  uid: string;
  title: string;
}

const link = (uid: string, title: string = uid): Link => ({ uid, title });

const group = (
  id: string,
  name: string,
  children: Modules.ContentStructure.ResolvedStructureChild[]
): Modules.ContentStructure.ResolvedGroupNode => ({ type: 'group', id, name, children });

const ct = (uid: string): Modules.ContentStructure.ResolvedStructureChild =>
  ({ type: 'contentType', uid }) as Modules.ContentStructure.ResolvedStructureChild;

const byTitle = (a: Link, b: Link) => a.title.localeCompare(b.title);

describe('deriveVisibleTree', () => {
  it('returns every link ungrouped and sorted when there are no groups', () => {
    const links = [link('api::b.b', 'B'), link('api::a.a', 'A')];

    expect(deriveVisibleTree([], links, byTitle)).toEqual([
      { type: 'link', link: link('api::a.a', 'A') },
      { type: 'link', link: link('api::b.b', 'B') },
    ]);
  });

  it('groups authorized leaves under their folder and keeps the tree order', () => {
    const links = [link('api::a.a', 'A'), link('api::b.b', 'B')];
    const groups = [group('g1', 'Folder', [ct('api::b.b'), ct('api::a.a')])];

    expect(deriveVisibleTree(groups, links, byTitle)).toEqual([
      {
        type: 'folder',
        id: 'g1',
        name: 'Folder',
        children: [
          { type: 'link', link: link('api::b.b', 'B') },
          { type: 'link', link: link('api::a.a', 'A') },
        ],
      },
    ]);
  });

  it('hides folders that have no visible descendant link', () => {
    const links = [link('api::a.a', 'A')];
    const groups = [group('g1', 'Empty', [ct('api::secret.secret')])];

    // Folder dropped; the authorized link falls back to the root.
    expect(deriveVisibleTree(groups, links, byTitle)).toEqual([
      { type: 'link', link: link('api::a.a', 'A') },
    ]);
  });

  it('drops tree leaves that are not authorized links', () => {
    const links = [link('api::a.a', 'A')];
    const groups = [group('g1', 'Folder', [ct('api::a.a'), ct('api::nope.nope')])];

    expect(deriveVisibleTree(groups, links)).toEqual([
      {
        type: 'folder',
        id: 'g1',
        name: 'Folder',
        children: [{ type: 'link', link: link('api::a.a', 'A') }],
      },
    ]);
  });

  it('places authorized links absent from the tree ungrouped at the root, sorted after folders', () => {
    const links = [link('api::z.z', 'Z'), link('api::a.a', 'A'), link('api::m.m', 'M')];
    const groups = [group('g1', 'Folder', [ct('api::m.m')])];

    expect(deriveVisibleTree(groups, links, byTitle)).toEqual([
      {
        type: 'folder',
        id: 'g1',
        name: 'Folder',
        children: [{ type: 'link', link: link('api::m.m', 'M') }],
      },
      { type: 'link', link: link('api::a.a', 'A') },
      { type: 'link', link: link('api::z.z', 'Z') },
    ]);
  });

  it('never drops an authorized link: every link appears exactly once', () => {
    const links = [link('api::a.a'), link('api::b.b'), link('api::c.c'), link('api::d.d')];
    const groups = [
      group('g1', 'One', [ct('api::a.a'), group('g2', 'Nested', [ct('api::b.b')])]),
      group('g3', 'Empty', [ct('api::ghost.ghost')]),
    ];

    const seen = flattenTreeLinks(deriveVisibleTree(groups, links, byTitle))
      .map(({ link }) => link.uid)
      .sort();

    expect(seen).toEqual(['api::a.a', 'api::b.b', 'api::c.c', 'api::d.d']);
  });

  it('supports nested folders', () => {
    const links = [link('api::a.a', 'A')];
    const groups = [group('g1', 'Outer', [group('g2', 'Inner', [ct('api::a.a')])])];

    expect(deriveVisibleTree(groups, links)).toEqual([
      {
        type: 'folder',
        id: 'g1',
        name: 'Outer',
        children: [
          {
            type: 'folder',
            id: 'g2',
            name: 'Inner',
            children: [{ type: 'link', link: link('api::a.a', 'A') }],
          },
        ],
      },
    ]);
  });
});

describe('flattenTreeLinks', () => {
  it('annotates each leaf with its folder path', () => {
    const links = [link('api::a.a', 'A'), link('api::b.b', 'B')];
    const groups = [group('g1', 'Outer', [group('g2', 'Inner', [ct('api::a.a')]), ct('api::b.b')])];

    expect(flattenTreeLinks(deriveVisibleTree(groups, links))).toEqual([
      { link: link('api::a.a', 'A'), path: ['Outer', 'Inner'] },
      { link: link('api::b.b', 'B'), path: ['Outer'] },
    ]);
  });
});

describe('countTreeLinks', () => {
  it('counts all leaf links recursively', () => {
    const links = [link('api::a.a'), link('api::b.b'), link('api::c.c')];
    const groups = [
      group('g1', 'Folder', [ct('api::a.a'), group('g2', 'Nested', [ct('api::b.b')])]),
    ];

    expect(countTreeLinks(deriveVisibleTree(groups, links))).toBe(3);
  });
});
