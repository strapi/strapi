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

describe('History version controller', () => {
  describe('findMany', () => {
    it('should require contentType and documentId for collection types', () => {
      const ctx = {
        state: {
          userAbility: {},
        },
        query: {},
      };

      const historyVersionController = createHistoryVersionController({
        // @ts-expect-error - we're not mocking the entire strapi object
        strapi: { getModel: jest.fn(() => ({ kind: 'collectionType' })) },
      });

      // @ts-expect-error partial context
      expect(historyVersionController.findMany(ctx)).rejects.toThrow(
        /contentType and documentId are required/
      );
      expect(mockFindVersionsPage).not.toHaveBeenCalled();
    });

    it('should require contentType for single types', () => {
      const ctx = {
        state: {
          userAbility: {},
        },
        query: {},
      };

      const historyVersionController = createHistoryVersionController({
        // @ts-expect-error - we're not mocking the entire strapi object
        strapi: { getModel: jest.fn(() => ({ kind: 'singleType' })) },
      });

      // @ts-expect-error partial context
      expect(historyVersionController.findMany(ctx)).rejects.toThrow(/contentType is required/);
      expect(mockFindVersionsPage).not.toHaveBeenCalled();
    });
  });

  it('should call findVersionsPage for collection types', async () => {
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

    const historyVersionController = createHistoryVersionController({
      // @ts-expect-error - we're not mocking the entire strapi object
      strapi: { getModel: jest.fn(() => ({ kind: 'collectionType' })) },
    });

    // @ts-expect-error partial context
    const response = await historyVersionController.findMany(ctx);

    expect(mockFindVersionsPage).toHaveBeenCalled();
    expect(response.data.length).toBe(1);
    expect(response.meta.pagination).toBeDefined();
  });

  it('should call findVersionsPage for single types', async () => {
    const ctx = {
      state: {
        userAbility: {},
      },
      query: {
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

    const historyVersionController = createHistoryVersionController({
      // @ts-expect-error - we're not mocking the entire strapi object
      strapi: { getModel: jest.fn(() => ({ kind: 'singleType' })) },
    });

    // @ts-expect-error partial context
    const response = await historyVersionController.findMany(ctx);

    expect(mockFindVersionsPage).toHaveBeenCalled();
    expect(response.data.length).toBe(1);
    expect(response.meta.pagination).toBeDefined();
  });
});
