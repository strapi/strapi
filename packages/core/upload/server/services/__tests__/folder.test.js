'use strict';

const { setPathAndUID } = require('../folder');

const folderUID = '9bc2352b-e29b-4ba3-810f-7b91033222de';
const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const rootPathRegex = /^\/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const folderPathRegex = new RegExp(
  '^/' + folderUID + '/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$',
  'i'
);

describe('folder', () => {
  describe('setPathAndUID', () => {
    beforeAll(() => {
      global.strapi = {
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
      const result = await setPathAndUID(clonedFolder);

      expect(result).toBe(clonedFolder);
      expect(result).toMatchObject({
        ...folder,
        uid: expect.stringMatching(uuidRegex),
        path: expect.stringMatching(expectedPath),
      });
    });
  });
});
