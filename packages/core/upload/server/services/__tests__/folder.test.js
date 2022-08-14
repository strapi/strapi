'use strict';

const { setPathIdAndPath } = require('../folder');

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
        },
        entityService: {
          findOne: jest.fn(() => ({ path: `/${folderUID}` })),
        },
      };
    });

    test.each([
      [{ parent: 1 }, folderPathRegex],
      [{}, rootPathRegex],
      [{ parent: null }, rootPathRegex],
    ])('inputs %s', async (folder, expectedPath) => {
      const clonedFolder = { ...folder };
      const result = await setPathIdAndPath(clonedFolder);

      expect(result).toBe(clonedFolder);
      expect(result).toMatchObject({
        ...folder,
        pathId: expect.any(Number),
        path: expect.stringMatching(expectedPath),
      });
    });
  });
});
