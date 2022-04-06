'use strict';

const { getLocation } = require('../file');

const folderLocation = '/9bc2352b-e29b-4ba3-810f-7b91033222de';

describe('file', () => {
  describe('getLocation', () => {
    beforeAll(() => {
      global.strapi = {
        entityService: {
          findOne: jest.fn(() => ({ location: folderLocation })),
        },
      };
    });

    test.each([
      [[1, 'myFile.txt'], folderLocation],
      [[undefined, 'myFile.txt'], '/'],
      [[null, 'myFile.txt'], '/'],
    ])('inputs %s should give %s', async (args, expectedResult) => {
      const result = await getLocation(...args);

      expect(result).toBe(expectedResult);
    });
  });
});
