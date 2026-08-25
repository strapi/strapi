import { contentStructureFileSchema } from '../validation';

const sections = (collectionTypes: unknown[] = [], singleTypes: unknown[] = []) => ({
  collectionTypes: { groups: collectionTypes },
  singleTypes: { groups: singleTypes },
});

const ok = (file: unknown) => contentStructureFileSchema.safeParse(file).success;

describe('contentStructureFileSchema', () => {
  test('accepts a canonical v1 file', () => {
    const file = {
      version: 1,
      sections: sections([{ id: 'grp_blog01', name: 'Blog', parent: null, children: [] }]),
    };

    expect(ok(file)).toBe(true);
  });

  test('rejects a malformed value', () => {
    expect(ok({ malformed: true })).toBe(false);
  });

  test('rejects an unsupported version', () => {
    expect(ok({ version: 2, sections: sections() })).toBe(false);
  });

  test('rejects a dangling parent reference', () => {
    const file = {
      version: 1,
      sections: sections([
        { id: 'grp_orphan1', name: 'Orphan', parent: 'grp_missing', children: [] },
      ]),
    };

    expect(ok(file)).toBe(false);
  });

  test('rejects nesting deeper than the maximum', () => {
    const file = {
      version: 1,
      sections: sections([
        {
          id: 'grp_lvl1',
          name: 'L1',
          parent: null,
          children: [{ type: 'group', id: 'grp_lvl2' }],
        },
        {
          id: 'grp_lvl2',
          name: 'L2',
          parent: 'grp_lvl1',
          children: [{ type: 'group', id: 'grp_lvl3' }],
        },
        {
          id: 'grp_lvl3',
          name: 'L3',
          parent: 'grp_lvl2',
          children: [{ type: 'group', id: 'grp_lvl4' }],
        },
        { id: 'grp_lvl4', name: 'L4', parent: 'grp_lvl3', children: [] },
      ]),
    };

    expect(ok(file)).toBe(false);
  });
});
