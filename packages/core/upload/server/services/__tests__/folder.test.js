'use strict';

const { setLocationAndUID } = require('../folder');

const folderUID = '9bc2352b-e29b-4ba3-810f-7b91033222de';
const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const rootLocationRegex = /^\/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const folderLocationRegex = new RegExp(
  '^/' + folderUID + '/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$',
  'i'
);

describe('folder', () => {
  describe('setLocationAndUID', () => {
    beforeAll(() => {
      global.strapi = {
        entityService: {
          findOne: jest.fn(() => ({ location: `/${folderUID}` })),
        },
      };
    });

    test.each([
      [{ parent: 1 }, folderLocationRegex],
      [{}, rootLocationRegex],
      [{ parent: null }, rootLocationRegex],
    ])('inputs %s', async (folder, expectedLocation) => {
      const clonedFolder = { ...folder };
      const result = await setLocationAndUID(clonedFolder);

      expect(result).toBe(clonedFolder);
      expect(result).toMatchObject({
        ...folder,
        uid: expect.stringMatching(uuidRegex),
        location: expect.stringMatching(expectedLocation),
      });
    });
  });
});
