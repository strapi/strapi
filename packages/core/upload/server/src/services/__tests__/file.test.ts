import fileService from '../file';

const folderPath = '/1';

describe('file', () => {
  describe('getFolderPath', () => {
    beforeAll(() => {
      global.strapi = {
        db: {
          query() {
            return { findOne: jest.fn(() => ({ path: folderPath })) };
          },
        },
      } as any;
    });

    test.each([
      [1, folderPath],
      [undefined, '/'],
      [null, '/'],
    ])('inputs %s should give %s', async (id, expectedResult) => {
      const result = await fileService.getFolderPath(id);

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
      } as any;

      const res = await fileService.deleteByIds([1, 2]);

      expect(res).toMatchObject([{ id: 1 }, { id: 2 }]);
      expect(remove).toHaveBeenCalledTimes(2);
      expect(remove).toHaveBeenNthCalledWith(1, { id: 1 });
      expect(remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('signFileUrls', () => {
    let provider: any;
    const file = {
      provider: 'private-provider',
      url: 'file-url',
    } as any;

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
            if (key === 'plugin::upload') {
              return {
                provider: 'private-provider',
              };
            }
          }),
        },
      } as any;
    });

    test('Sign file URL when provider is private', async () => {
      provider.isPrivate.mockResolvedValue(true);
      provider.getSignedUrl.mockResolvedValue({ url: 'signed_file-url' });

      const result = await fileService.signFileUrls(file);

      expect(result).toHaveProperty('isUrlSigned', true);
      expect(result).toHaveProperty('url', 'signed_file-url');
      expect(provider.isPrivate).toHaveBeenCalledTimes(1);
      expect(provider.getSignedUrl).toHaveBeenCalledTimes(1);
    });

    test('Do not sign file URL when provider is not private', async () => {
      provider.isPrivate.mockResolvedValue(false);

      const result = await fileService.signFileUrls(file);

      expect(result).toHaveProperty('isUrlSigned', false);
      expect(result).toHaveProperty('url', 'file-url');
      expect(provider.isPrivate).toHaveBeenCalledTimes(1);
      expect(provider.getSignedUrl).not.toHaveBeenCalled();
    });
  });
});
