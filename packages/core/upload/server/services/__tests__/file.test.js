'use strict';

const { getFolderPath } = require('../file');

const folderPath = '/9bc2352b-e29b-4ba3-810f-7b91033222de';

describe('file', () => {
  describe('getFolderPath', () => {
    beforeAll(() => {
      global.strapi = {
        entityService: {
          findOne: jest.fn(() => ({ path: folderPath })),
        },
      };
    });

    test.each([
      [[1, 'myFile.txt'], folderPath],
      [[undefined, 'myFile.txt'], '/'],
      [[null, 'myFile.txt'], '/'],
    ])('inputs %s should give %s', async (args, expectedResult) => {
      const result = await getFolderPath(...args);

      expect(result).toBe(expectedResult);
    });
  });
});
