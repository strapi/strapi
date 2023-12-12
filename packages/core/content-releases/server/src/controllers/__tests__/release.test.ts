import releaseController from '../release';

const mockFindPage = jest.fn();
const mockFindManyForContentTypeEntry = jest.fn();
const mockCountActions = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    findOne: jest.fn(() => ({ id: 1 })),
    findPage: mockFindPage,
    findManyForContentTypeEntry: mockFindManyForContentTypeEntry,
    countActions: mockCountActions,
    getContentTypesDataForActions: jest.fn(),
  })),
  getAllowedContentTypes: jest.fn(() => ['contentTypeA', 'contentTypeB']),
}));

describe('Release controller', () => {
  describe('findMany', () => {
    it('should call findPage', async () => {
      mockFindPage.mockResolvedValue({ results: [], pagination: {} });
      mockFindManyForContentTypeEntry.mockResolvedValue([]);
      const userAbility = {
        can: jest.fn(),
      };
      const ctx = {
        state: {
          userAbility: {},
        },
        query: {
          page: 1,
          pageSize: 10,
        },
      };
      global.strapi = {
        // @ts-expect-error Ignore missing properties
        admin: {
          services: {
            permission: {
              createPermissionsManager: jest.fn(() => ({
                ability: userAbility,
                validateQuery: jest.fn(),
                sanitizeQuery: jest.fn(() => ctx.query),
              })),
            },
          },
        },
      };

      // @ts-expect-error partial context
      await releaseController.findMany(ctx);

      expect(mockFindPage).toHaveBeenCalled();
    });

    it('should call findManyForContentTypeEntry', async () => {
      mockFindPage.mockResolvedValue({ results: [], pagination: {} });
      mockFindManyForContentTypeEntry.mockResolvedValue([]);
      const userAbility = {
        can: jest.fn(),
      };
      const ctx = {
        state: {
          userAbility: {},
        },
        query: {
          contentTypeUid: 'api::kitchensink.kitchensink',
          entryId: 1,
        },
      };
      global.strapi = {
        // @ts-expect-error Ignore missing properties
        admin: {
          services: {
            permission: {
              createPermissionsManager: jest.fn(() => ({
                ability: userAbility,
                validateQuery: jest.fn(),
                sanitizeQuery: jest.fn(() => ctx.query),
              })),
            },
          },
        },
      };

      // @ts-expect-error partial context
      await releaseController.findMany(ctx);

      expect(mockFindManyForContentTypeEntry).toHaveBeenCalled();
    });
  });
  describe('create', () => {
    it('throws an error given bad request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {},
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseController.create(ctx)).rejects.toThrow('name is a required field');
    });
  });

  describe('update', () => {
    it('throws an error given bad request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {
            name: '',
          },
        },
        params: {
          id: 1,
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseController.update(ctx)).rejects.toThrow('name is a required field');
    });

    it('throws an error given unknown request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {
            name: 'Test',
            unknown: '',
          },
        },
        params: {
          id: 1,
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseController.update(ctx)).rejects.toThrow(
        'this field has unspecified keys: unknown'
      );
    });
  });

  describe('findOne', () => {
    beforeAll(() => {
      global.strapi = {
        ...global.strapi,
        // @ts-expect-error Ignore missing properties
        admin: {
          services: {
            permission: {
              createPermissionsManager: jest.fn(() => ({
                sanitizeOutput: jest.fn(),
              })),
            },
          },
        },
      };
    });

    it('throws an error if the release does not exists', async () => {
      const ctx = {
        state: {
          userAbility: {
            can: jest.fn(() => true),
          },
        },
        params: {
          id: 1,
        },
        user: {},
        body: {
          data: {
            actions: {
              meta: {
                count: 0,
              },
            },
            meta: {},
          },
        },
      };
      // @ts-expect-error partial context
      expect(() => releaseController.findOne(ctx).rejects.toThrow('Release not found for id: 1'));
    });

    it('returns the right meta object', async () => {
      const ctx = {
        state: {
          userAbility: {
            can: jest.fn(() => true),
          },
        },
        params: {
          id: 1,
        },
        user: {},
        body: {
          data: {
            actions: {
              meta: {
                count: 0,
              },
            },
            meta: {},
          },
        },
      };
      // We mock the count all actions
      mockCountActions.mockResolvedValueOnce(2);

      // We mock the count hidden actions
      mockCountActions.mockResolvedValueOnce(1);

      // @ts-expect-error partial context
      await releaseController.findOne(ctx);
      expect(ctx.body.data.actions.meta).toEqual({
        count: 2,
      });
    });
  });
});
