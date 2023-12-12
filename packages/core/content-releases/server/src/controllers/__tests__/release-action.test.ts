import releaseActionController from '../release-action';

const mockSanitizedQueryRead = jest.fn().mockResolvedValue({});
const mockFindActions = jest.fn().mockResolvedValue({ results: [], pagination: {} });
const mockSanitizeOutput = jest.fn((entry: { id: number; name: string }) => ({ id: entry.id }));

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    create: jest.fn(),
    findActions: mockFindActions,
    getContentTypesDataForActions: jest.fn(() => ({
      'api::contentTypeA.contentTypeA': {
        mainField: 'name',
        displayName: 'contentTypeA',
      },
      'api::contentTypeB.contentTypeB': {
        mainField: 'name',
        displayName: 'contentTypeB',
      },
    })),
  })),
  getPermissionsChecker: jest.fn(() => ({
    sanitizedQuery: {
      read: mockSanitizedQueryRead,
    },
    sanitizeOutput: mockSanitizeOutput,
  })),
}));

describe('Release Action controller', () => {
  describe('create', () => {
    beforeEach(() => {
      global.strapi = {
        utils: {
          errors: {
            ApplicationError: jest.fn(),
          },
        },
        contentType: jest.fn(),
        // @ts-expect-error Ignore missing properties
        admin: {
          services: {
            role: {
              hasSuperAdminRole: jest.fn(),
            },
          },
        },
      };
    });

    it('throws an error given bad request arguments', () => {
      // Mock content type
      global.strapi.contentType = jest.fn().mockReturnValue({
        options: {
          draftAndPublish: true,
        },
      });
      // @ts-expect-error Ignore missing properties
      global.strapi.entityService = {
        findOne: jest.fn().mockReturnValue({
          actions: [
            {
              contentType: 'api::category.category',
              entry: {
                id: 2,
              },
            },
          ],
        }),
      };

      const ctx = {
        state: {
          user: {},
        },
        params: {
          id: 1,
        },
        request: {
          // Mock missing type property
          body: {
            entry: {
              id: 1,
              contentType: 'api::category.category',
            },
          },
        },
      };

      // @ts-expect-error Ignore missing properties
      expect(() => releaseActionController.create(ctx)).rejects.toThrow('type is a required field');
    });
  });

  describe('update', () => {
    it('throws an error given bad request arguments', () => {
      const ctx = {
        params: {
          actionId: 1,
        },
        request: {
          // Mock missing type property
          body: {
            type: 'ffff',
          },
        },
      };

      // @ts-expect-error Ignore missing properties
      expect(() => releaseActionController.update(ctx)).rejects.toThrow(
        'type must be one of the following values: publish, unpublish'
      );
    });
  });

  describe('findMany', () => {
    it('should return the data for an entry', async () => {
      mockFindActions.mockResolvedValueOnce({
        results: [
          {
            id: 1,
            contentType: 'api::contentTypeA.contentTypeA',
            entry: { id: 1, name: 'test 1', locale: 'en' },
          },
          {
            id: 2,
            contentType: 'api::contentTypeB.contentTypeB',
            entry: { id: 2, name: 'test 2', locale: 'fr' },
          },
        ],
        pagination: {},
      });
      global.strapi = {
        plugins: {
          // @ts-expect-error Ignore missing properties
          i18n: {
            services: {
              locales: {
                find: jest.fn().mockReturnValue([
                  {
                    id: 1,
                    name: 'English (en)',
                    code: 'en',
                  },
                  {
                    id: 2,
                    name: 'French (fr)',
                    code: 'fr',
                  },
                ]),
              },
            },
          },
        },
        // @ts-expect-error Ignore missing properties
        admin: {
          services: {
            permission: {
              createPermissionsManager: jest.fn(() => ({
                ability: {
                  can: jest.fn(),
                },
                validateQuery: jest.fn(),
                sanitizeQuery: jest.fn(() => ctx.query),
              })),
            },
          },
        },
      };

      const ctx = {
        state: {
          userAbility: {},
        },
        params: {
          releaseId: 1,
        },
        query: {},
      };
      // @ts-expect-error Ignore missing properties
      await releaseActionController.findMany(ctx);

      // @ts-expect-error Ignore missing properties
      expect(ctx.body.data[0].entry).toEqual({
        id: 1,
        contentType: {
          displayName: 'contentTypeA',
          mainFieldValue: 'test 1',
        },
        locale: {
          code: 'en',
          name: 'English (en)',
        },
      });
      // @ts-expect-error Ignore missing properties
      expect(ctx.body.data[1].entry).toEqual({
        id: 2,
        contentType: {
          displayName: 'contentTypeB',
          mainFieldValue: 'test 2',
        },
        locale: {
          code: 'fr',
          name: 'French (fr)',
        },
      });
    });
  });
});
