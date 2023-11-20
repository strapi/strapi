'use strict';

const { getFolderPath, deleteByIds, signFileUrls } = require('../file');

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

  describe('signFileUrls', () => {
    let provider;
    const file = {
      provider: 'private-provider',
      url: 'file-url',
    };

    beforeEach(() => {
      provider = {
        isPrivate: jest.fn(),
        getSignedUrl: jest.fn(),
      };

      global.strapi = {
        plugins: {
          upload: {
            provider,
          },
        },
        config: {
          get: jest.fn((key) => {
            if (key === 'plugin.upload') {
              return {
                provider: 'private-provider',
              };
            }
          }),
        },
      };
    });

    test('Sign file URL when provider is private', async () => {
      provider.isPrivate.mockResolvedValue(true);
      provider.getSignedUrl.mockResolvedValue({ url: 'signed_file-url' });

      const result = await signFileUrls(file);

      expect(result).toHaveProperty('isUrlSigned', true);
      expect(result).toHaveProperty('url', 'signed_file-url');
      expect(provider.isPrivate).toHaveBeenCalledTimes(1);
      expect(provider.getSignedUrl).toHaveBeenCalledTimes(1);
    });

    test('Do not sign file URL when provider is not private', async () => {
      provider.isPrivate.mockResolvedValue(false);

      const result = await signFileUrls(file);

      expect(result).toHaveProperty('isUrlSigned', false);
      expect(result).toHaveProperty('url', 'file-url');
      expect(provider.isPrivate).toHaveBeenCalledTimes(1);
      expect(provider.getSignedUrl).not.toHaveBeenCalled();
    });
  });
});
