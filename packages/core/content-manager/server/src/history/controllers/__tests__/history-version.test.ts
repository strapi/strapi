import { createHistoryVersionController } from '../history-version';

const mockFindVersionsPage = jest.fn();

// History utils
jest.mock('../../utils', () => ({
  getService: jest.fn((_strapi, name) => {
    if (name === 'history') {
      return {
        findVersionsPage: mockFindVersionsPage,
      };
    }
  }),
}));

// Content Manager utils
jest.mock('../../../utils', () => ({
  getService: jest.fn((name) => {
    if (name === 'permission-checker') {
      return {
        create: jest.fn(() => ({
          cannot: {
            read: jest.fn(() => false),
          },
        })),
      };
    }
  }),
}));

const mockStrapi = {};

// @ts-expect-error - we're not mocking the entire strapi object
const historyVersionController = createHistoryVersionController({ strapi: mockStrapi });

describe('History version controller', () => {
  describe('findMany', () => {
    it('should require contentType and documentId', () => {
      const ctx = {
        state: {
          userAbility: {},
        },
        query: {},
      };

      // @ts-expect-error partial context
      expect(historyVersionController.findMany(ctx)).rejects.toThrow(
        /contentType and documentId are required/
      );

      expect(mockFindVersionsPage).not.toHaveBeenCalled();
    });
  });

  it('should call findVersionsPage', async () => {
    const ctx = {
      state: {
        userAbility: {},
      },
      query: {
        documentId: 'document-id',
        contentType: 'api::test.test',
      },
    };

    mockFindVersionsPage.mockResolvedValueOnce({
      results: [{ id: 'history-version-id' }],
      pagination: {
        page: 1,
        pageSize: 10,
        pageCount: 1,
        total: 0,
      },
    });

    // @ts-expect-error partial context
    const response = await historyVersionController.findMany(ctx);

    expect(mockFindVersionsPage).toHaveBeenCalled();
    expect(response.data.length).toBe(1);
    expect(response.meta.pagination).toBeDefined();
  });
});
