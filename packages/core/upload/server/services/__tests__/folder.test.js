'use strict';

const { setPathAndUID } = require('../folder');

const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

describe('folder', () => {
  describe('setPathAndUID', () => {
    beforeAll(() => {
      global.strapi = {
        entityService: {
          findOne: jest.fn(() => ({ path: '/parent-path' })),
        },
      };
    });

    test.each([
      [{ parent: 1, name: 'myFile.txt' }, '/parent-path/myFile.txt'],
      [{ name: 'myFile.txt' }, '/myFile.txt'],
      [{ parent: null, name: 'myFile.txt' }, '/myFile.txt'],
    ])('inputs %s', async (folder, expectedPath) => {
      const clonedFolder = { ...folder };
      const result = await setPathAndUID(clonedFolder);

      expect(result).toBe(clonedFolder);
      expect(result).toMatchObject({
        ...folder,
        uid: expect.stringMatching(uuidRegex),
        path: expectedPath,
      });
    });
  });
});
