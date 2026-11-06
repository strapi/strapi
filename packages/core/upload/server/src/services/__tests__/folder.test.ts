import folderService from '../folder';

const folderUID = '1';
const rootPathRegex = /^\/[0-9]*$/i;
const folderPathRegex = new RegExp(`^/${folderUID}/[0-9]*$`, 'i');

describe('folder', () => {
  describe('setPathIdAndPath', () => {
    beforeAll(() => {
      global.strapi = {
        db: {
          queryBuilder: () => ({
            max: () => ({
              first: () => ({
                execute: () => ({ max: 2 }),
              }),
            }),
          }),
          query() {
            return {
              findOne: jest.fn(() => ({ path: `/${folderUID}` })),
            };
          },
        },
      } as any;
    });

    test.each([
      [{ parent: 1 }, folderPathRegex],
      [{}, rootPathRegex],
      [{ parent: null }, rootPathRegex],
    ])('inputs %s', async (folder, expectedPath) => {
      const clonedFolder = { ...folder };
      const result = await folderService.setPathIdAndPath(clonedFolder);

      expect(result).toBe(clonedFolder);
      expect(result).toMatchObject({
        ...folder,
        pathId: expect.any(Number),
        path: expect.stringMatching(expectedPath),
      });
    });
  });

  describe('getStructure', () => {
    beforeAll(() => {
      const rows = [
        { id: 1, name: 'b-root', parent: null },
        { id: 2, name: 'a-root', parent: null },
        { id: 3, name: 'child', parent: 1 },
      ];
      const qb = {
        getAlias: () => 't1',
        alias: 't0',
        select: () => qb,
        join: () => qb,
        execute: async () => rows,
      };

      global.strapi = {
        db: {
          metadata: {
            get: () => ({
              attributes: {
                parent: {
                  joinTable: {
                    name: 'upload_folders_parent_lnk',
                    joinColumn: { name: 'folder_id', referencedColumn: 'id' },
                    inverseJoinColumn: { name: 'inv_folder_id' },
                  },
                },
              },
            }),
          },
          queryBuilder: () => qb,
        },
      } as any;
    });

    test('returns a tree of { id, name, children } nodes sorted by name', async () => {
      const tree = await folderService.getStructure();

      expect(tree).toEqual([
        { id: 2, name: 'a-root', children: [] },
        { id: 1, name: 'b-root', children: [{ id: 3, name: 'child', children: [] }] },
      ]);

      // Type-level check: children are nodes, not ids (verified by test:ts:back)
      // @ts-expect-error - a node's children cannot be read as a list of ids
      const childIds: number[] = tree[1].children;
      expect(childIds).toHaveLength(1);
    });
  });
});
