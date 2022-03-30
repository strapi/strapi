'use strict';

const { getPath } = require('../file');

describe('file', () => {
  describe('getPath', () => {
    beforeAll(() => {
      global.strapi = {
        entityService: {
          findOne: jest.fn(() => ({ path: '/parent-path' })),
        },
      };
    });

    test.each([
      [[1, 'myFile.txt'], '/parent-path/myFile.txt'],
      [[undefined, 'myFile.txt'], '/myFile.txt'],
      [[null, 'myFile.txt'], '/myFile.txt'],
    ])('inputs %s should give %s', async (args, expectedResult) => {
      const result = await getPath(...args);

      expect(result).toBe(expectedResult);
    });
  });
});
