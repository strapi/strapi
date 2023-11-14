import releaseActionController from '../release-action';

describe('Release Action controllers', () => {
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

    it('throws an error if the user does not have the correct permissions', async () => {
      const ctx = {
        state: {
          user: {},
        },
        request: {
          body: {
            releaseId: 1,
            entry: {
              id: 1,
              contentType: 'api::category.category',
            },
            type: 'publish',
          },
        },
      };

      // @ts-expect-error Ignore missing properties
      expect(() => releaseActionController.create(ctx)).rejects.toThrow(
        'Content Releases is a superadmin only feature'
      );
    });

    it('throws an error given bad request arguments', async () => {
      // Mock permitted user
      global.strapi.admin.services.role.hasSuperAdminRole.mockReturnValue(true);

      const ctx = {
        state: {
          user: {},
        },
        request: {
          // Mock missing type property
          body: {
            releaseId: 1,
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

    it('throws an error if the content type does not exist', async () => {
      // Mock permitted user
      global.strapi.admin.services.role.hasSuperAdminRole.mockReturnValue(true);
      const ctx = {
        state: {
          user: {},
        },
        request: {
          body: {
            releaseId: 1,
            entry: {
              id: 1,
              contentType: 'api::plop.plop',
            },
            type: 'publish',
          },
        },
      };

      // @ts-expect-error Ignore missing properties
      expect(() => releaseActionController.create(ctx)).rejects.toThrow(
        'No content type found for uid api::plop.plop'
      );
    });

    it('throws an error if the content type does not have draftAndPublish enabled', async () => {
      // Mock permitted user
      global.strapi.admin.services.role.hasSuperAdminRole.mockReturnValue(true);
      // Mock content type
      global.strapi.contentType = jest.fn().mockReturnValue({
        options: {},
      });

      const ctx = {
        state: {
          user: {},
        },
        request: {
          body: {
            releaseId: 1,
            entry: {
              id: 1,
              contentType: 'api::category.category',
            },
            type: 'publish',
          },
        },
      };

      // @ts-expect-error Ignore missing properties
      expect(() => releaseActionController.create(ctx)).rejects.toThrow(
        'Content type with uid api::category.category does not have draftAndPublish enabled'
      );
    });

    it('throws an error if the release does not exist', async () => {
      // Mock permitted user
      global.strapi.admin.services.role.hasSuperAdminRole.mockReturnValue(true);
      // Mock content type
      global.strapi.contentType = jest.fn().mockReturnValue({
        options: {
          draftAndPublish: true,
        },
      });
      // @ts-expect-error Ignore missing properties
      global.strapi.entityService = {
        findOne: jest.fn().mockReturnValue(null),
      };

      const ctx = {
        state: {
          user: {},
        },
        request: {
          body: {
            releaseId: 1,
            entry: {
              id: 1,
              contentType: 'api::category.category',
            },
            type: 'publish',
          },
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseActionController.create(ctx)).rejects.toThrow(
        'No release found for id 1'
      );
    });

    it('throws an error if the entry already exists in the release', async () => {
      // Mock permitted user
      global.strapi.admin.services.role.hasSuperAdminRole.mockReturnValue(true);
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
              entry: {
                id: 1,
              },
            },
          ],
        }),
      };

      const ctx = {
        state: {
          user: {},
        },
        request: {
          body: {
            releaseId: 1,
            entry: {
              id: 1,
              contentType: 'api::category.category',
            },
            type: 'publish',
          },
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseActionController.create(ctx)).rejects.toThrow(
        'Entry with id 1 already exists in release with id 1'
      );
    });

    it('creates a release action', async () => {
      // Mock permitted user
      global.strapi.admin.services.role.hasSuperAdminRole.mockReturnValue(true);
      // Mock content type
      global.strapi.contentType = jest.fn().mockReturnValue({
        options: {
          draftAndPublish: true,
        },
      });
      // @ts-expect-error Ignore missing properties
      global.strapi.entityService = {
        findOne: jest.fn().mockReturnValue({
          actions: [],
        }),
      };
      // Mock release action service
      global.strapi.plugin = jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue({
          create: jest.fn().mockReturnValue({
            id: 1,
          }),
        }),
      });

      const ctx = {
        state: {
          user: {},
        },
        request: {
          body: {
            releaseId: 1,
            entry: {
              id: 1,
              contentType: 'api::category.category',
            },
            type: 'publish',
          },
        },
        body: {},
      };
      // @ts-expect-error Ignore missing properties
      await releaseActionController.create(ctx);

      expect(ctx.body).toEqual({
        data: {
          id: 1,
        },
      });
    });
  });
});
