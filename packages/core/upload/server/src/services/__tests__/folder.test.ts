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

  describe('getNamePaths', () => {
    const findMany = jest.fn(async () => [
      { pathId: 1, name: 'Clients' },
      { pathId: 2, name: 'Acme' },
    ]);

    beforeAll(() => {
      global.strapi = {
        db: {
          query: () => ({ findMany }),
        },
      } as any;
    });

    beforeEach(() => {
      findMany.mockClear();
    });

    test.each([
      ['/1/2', '/Clients/Acme'],
      ['/imported', '/'],
      ['/legacy/nested', '/'],
      ['/1/xx/2', '/Clients/Acme'],
    ])('maps %s to %s', async (path, namePath) => {
      expect(await folderService.getNamePaths([path])).toEqual({ [path]: namePath });
    });

    test.each(['99999999999', '2147483648', '1e21'])(
      'skips the out-of-range segment %s without querying it',
      async (segment) => {
        const path = `/1/${segment}/2`;

        expect(await folderService.getNamePaths([path])).toEqual({ [path]: '/Clients/Acme' });
        expect(findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { pathId: { $in: [1, 2] } } })
        );
      }
    );
  });
});
