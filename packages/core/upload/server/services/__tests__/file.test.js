'use strict';

const { getFolderPath, deleteByIds } = require('../file');

const folderPath = '/1';

const removeMock = jest.fn();
jest.mock('@strapi/strapi', () => {
  const strapiMock = {
    entityService: {
      findOne: jest.fn(() => ({ path: folderPath })),
    },
    plugins: {
      upload: {
        service() {
          return {
            remove: removeMock,
          };
        },
      },
    },
    plugin(name) {
      return this.plugins[name];
    },
    db: {
      query: () => ({
        findMany: jest.fn(() => [{ id: 1 }, { id: 2 }]),
      }),
    },
  };
  return new Proxy(strapiMock, {
    get: (target, prop) => target[prop],
  });
});

describe('file', () => {
  describe('getFolderPath', () => {
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
      const res = await deleteByIds([1, 2]);

      expect(res).toMatchObject([{ id: 1 }, { id: 2 }]);

      expect(removeMock).toHaveBeenCalledTimes(2);
      expect(removeMock).toHaveBeenNthCalledWith(1, { id: 1 });
      expect(removeMock).toHaveBeenCalledTimes(2, { id: 2 });
    });
  });
});
