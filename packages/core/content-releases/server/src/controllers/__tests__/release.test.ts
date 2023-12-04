import releaseController from '../release';

const mockFindPage = jest.fn();
const mockFindMany = jest.fn();
const mockCountActions = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    findOne: jest.fn(() => ({ id: 1 })),
    findPage: mockFindPage,
    findMany: mockFindMany,
    countActions: mockCountActions,
    findReleaseContentTypesMainFields: jest.fn(),
  })),
  getAllowedContentTypes: jest.fn(() => ['contentTypeA', 'contentTypeB']),
}));

describe('Release controller', () => {
  describe('findMany', () => {
    it('should call findPage', async () => {
      mockFindPage.mockResolvedValue({ results: [], pagination: {} });
      mockFindMany.mockResolvedValue([]);
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

    it('should call findMany', async () => {
      mockFindPage.mockResolvedValue({ results: [], pagination: {} });
      mockFindMany.mockResolvedValue([]);
      const userAbility = {
        can: jest.fn(),
      };
      const ctx = {
        state: {
          userAbility: {},
        },
        query: {},
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

      expect(mockFindMany).toHaveBeenCalled();
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
    global.strapi = {
      ...global.strapi,
      plugins: {
        // @ts-expect-error incomplete plugin
        'content-manager': {
          services: {
            'content-types': {
              findConfiguration: () => ({
                settings: {
                  mainField: 'name',
                },
              }),
            },
          },
        },
      },
    };

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
              total: 0,
              totalHidden: 0,
            },
          },
          meta: {},
        },
      },
    };

    it('throws an error if the release does not exists', async () => {
      // @ts-expect-error partial context
      expect(() => releaseController.findOne(ctx).rejects.toThrow('Release not found for id: 1'));
    });

    it('return the right meta object', async () => {
      // We mock the count all actions
      mockCountActions.mockResolvedValueOnce(2);

      // We mock the count hidden actions
      mockCountActions.mockResolvedValueOnce(1);

      // @ts-expect-error partial context
      await releaseController.findOne(ctx);
      expect(ctx.body.data.actions.meta).toEqual({
        total: 2,
        totalHidden: 1,
      });
    });
  });

  describe('publish', () => {
    it('throws an error if user is not super admin', async () => {
      const ctx = {
        state: {
          userAbility: {
            can: jest.fn(() => false),
          },
        },
        params: {
          id: 1,
        },
        user: {
          roles: [
            {
              id: 1,
              code: 'strapi-editor',
            },
          ],
        },
      };

      expect(() =>
        // @ts-expect-error partial context
        releaseController.publish(ctx).rejects.toThrow('Only superadmins can publish a release')
      );
    });
  });
});
