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

  test('accepts opaque non-empty group ids and resolves parent and child references exactly', () => {
    const file = {
      version: 1,
      sections: sections([
        {
          id: 'g1',
          name: 'Root',
          parent: null,
          children: [{ type: 'group', id: 'my-folder' }],
        },
        {
          id: 'my-folder',
          name: 'Child',
          parent: 'g1',
          children: [{ type: 'group', id: 'grp_abc12345' }],
        },
        { id: 'grp_abc12345', name: 'Leaf', parent: 'my-folder', children: [] },
      ]),
    };

    expect(ok(file)).toBe(true);
  });

  test('rejects a malformed value', () => {
    expect(ok({ malformed: true })).toBe(false);
  });

  test('rejects an unsupported version', () => {
    expect(ok({ version: 2, sections: sections() })).toBe(false);
  });

  test('rejects an empty group id', () => {
    const file = {
      version: 1,
      sections: sections([{ id: '', name: 'Empty', parent: null, children: [] }]),
    };

    expect(ok(file)).toBe(false);
  });

  test('rejects duplicate group ids across both sections', () => {
    const file = {
      version: 1,
      sections: sections(
        [{ id: 'g1', name: 'Collection', parent: null, children: [] }],
        [{ id: 'g1', name: 'Single', parent: null, children: [] }]
      ),
    };

    expect(ok(file)).toBe(false);
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

  test('rejects a parent reference that differs from an opaque id only by trailing whitespace', () => {
    const file = {
      version: 1,
      sections: sections([
        { id: 'my-folder', name: 'Folder', parent: null, children: [] },
        { id: 'g1', name: 'Child', parent: 'my-folder ', children: [] },
      ]),
    };

    expect(ok(file)).toBe(false);
  });

  test('rejects a group-child reference that differs from an opaque id only by trailing whitespace', () => {
    const file = {
      version: 1,
      sections: sections([
        {
          id: 'g1',
          name: 'Parent',
          parent: null,
          children: [{ type: 'group', id: 'my-folder ' }],
        },
        { id: 'my-folder', name: 'Folder', parent: 'g1', children: [] },
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

  test('rejects a parent cycle', () => {
    const file = {
      version: 1,
      sections: sections([
        {
          id: 'g1',
          name: 'First',
          parent: 'my-folder',
          children: [{ type: 'group', id: 'my-folder' }],
        },
        {
          id: 'my-folder',
          name: 'Second',
          parent: 'g1',
          children: [{ type: 'group', id: 'g1' }],
        },
      ]),
    };

    expect(ok(file)).toBe(false);
  });

  test('rejects invalid group names and content type uids', () => {
    const invalidName = {
      version: 1,
      sections: sections([{ id: 'g1', name: ' Invalid', parent: null, children: [] }]),
    };
    const invalidUid = {
      version: 1,
      sections: sections([
        {
          id: 'g1',
          name: 'Valid',
          parent: null,
          children: [{ type: 'contentType', uid: 'not-a-uid' }],
        },
      ]),
    };

    expect(ok(invalidName)).toBe(false);
    expect(ok(invalidUid)).toBe(false);
  });
});
