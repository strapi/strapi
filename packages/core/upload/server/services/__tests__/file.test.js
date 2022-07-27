'use strict';

const { getFolderPath, deleteByIds } = require('../file');

const folderPath = '/1';

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

  describe('deleteByIds', () => {
    test('Delete 2 files', async () => {
      const remove = jest.fn();

      global.strapi = {
        plugins: {
          upload: {
            services: {
              upload: {
                remove,
              },
            },
          },
        },
        db: {
          query: () => ({
            findMany: jest.fn(() => [{ id: 1 }, { id: 2 }]),
          }),
        },
      };

      const res = await deleteByIds([1, 2]);

      expect(res).toMatchObject([{ id: 1 }, { id: 2 }]);
      expect(remove).toHaveBeenCalledTimes(2);
      expect(remove).toHaveBeenNthCalledWith(1, { id: 1 });
      expect(remove).toHaveBeenCalledTimes(2, { id: 2 });
    });
  });
});
