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
    const rows = [
      { id: 1, name: 'Zeta', parent: null },
      { id: 2, name: 'alpha', parent: null },
      { id: 3, name: 'Beta', parent: null },
      { id: 4, name: 'b', parent: 1 },
      { id: 5, name: 'a', parent: 1 },
      { id: 6, name: 'c', parent: 5 },
      { id: 7, name: 'a', parent: 1 },
    ];

    beforeAll(() => {
      const queryBuilder: {
        alias: string;
        getAlias: () => string;
        select: jest.Mock;
        join: jest.Mock;
        execute: jest.Mock;
      } = {
        alias: 't0',
        getAlias: () => 't1',
        select: jest.fn(() => queryBuilder),
        join: jest.fn(() => queryBuilder),
        execute: jest.fn(async () => rows.map((row) => ({ ...row }))),
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
          queryBuilder: () => queryBuilder,
        },
      } as any;
    });

    test('nests folders under their parent and sorts every level by name', async () => {
      const structure = await folderService.getStructure();

      expect(structure).toEqual([
        { id: 3, name: 'Beta', children: [] },
        {
          id: 1,
          name: 'Zeta',
          children: [
            // Same name: insertion order is kept (stable sort)
            { id: 5, name: 'a', children: [{ id: 6, name: 'c', children: [] }] },
            { id: 7, name: 'a', children: [] },
            { id: 4, name: 'b', children: [] },
          ],
        },
        { id: 2, name: 'alpha', children: [] },
      ]);
    });
  });
});
