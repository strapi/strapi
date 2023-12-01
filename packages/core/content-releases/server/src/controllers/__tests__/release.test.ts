import releaseController from '../release';

describe('Release controller', () => {
  describe('findMany', () => {
    it('should call findPage', async () => {
      const findPage = jest.fn().mockResolvedValue({ results: [], pagination: {} });
      const findMany = jest.fn().mockResolvedValue([]);
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
        plugins: {
          // @ts-expect-error Ignore missing properties
          'content-releases': {
            services: {
              release: {
                findPage,
                findMany,
              },
            },
          },
        },
      };

      // @ts-expect-error partial context
      await releaseController.findMany(ctx);

      expect(findPage).toHaveBeenCalled();
    });

    it('should call findMany', async () => {
      const findPage = jest.fn().mockResolvedValue({ results: [], pagination: {} });
      const findMany = jest.fn().mockResolvedValue([]);
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
        plugins: {
          // @ts-expect-error Ignore missing properties
          'content-releases': {
            services: {
              release: {
                findPage,
                findMany,
              },
            },
          },
        },
      };

      // @ts-expect-error partial context
      await releaseController.findMany(ctx);

      expect(findMany).toHaveBeenCalled();
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
});
