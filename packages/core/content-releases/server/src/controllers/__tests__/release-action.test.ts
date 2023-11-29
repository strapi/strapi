import releaseActionController from '../release-action';

const mockSanitizedQueryRead = jest.fn().mockResolvedValue({});
const mockFindActions = jest.fn().mockResolvedValue({ results: [], pagination: {} });
const mockSanitizeOutput = jest.fn((entry: { id: number, name: string }) => ({ id: entry.id }));

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    create: jest.fn(),
    findActions: mockFindActions,
  })),
  getAllowedContentTypes: jest.fn().mockReturnValue(['api::contentTypeA.contentTypeA', 'api::contentTypeB.contentTypeB']),
  getPermissionsChecker: jest.fn(() => ({
    sanitizedQuery: {
      read: mockSanitizedQueryRead,
    },
    sanitizeOutput: mockSanitizeOutput
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

  describe('findMany', () => {
    const ctx = {
      state: {
        userAbility: {
          can: jest.fn(),
        },
      },
      params: {
        releaseId: 1,
      },
    };

    it('should call sanitizedQueryRead once for each contentType', async () => {
      // @ts-expect-error Ignore missing properties
      await releaseActionController.findMany(ctx);

      expect(mockSanitizedQueryRead).toHaveBeenCalledTimes(2);
    });

    it('should call findActions with the right params', async () => {
      // @ts-expect-error Ignore missing properties
      await releaseActionController.findMany(ctx);

      expect(mockFindActions).toHaveBeenCalledWith(1, ['api::contentTypeA.contentTypeA', 'api::contentTypeB.contentTypeB'], {
        populate: {
          entry: {
            on: {
              'api::contentTypeA.contentTypeA': {},
              'api::contentTypeB.contentTypeB': {},
            },
          },
        },
      });
    });

    it('should sanitize each entry separately based on its contentType', async () => {
      mockFindActions.mockResolvedValueOnce({
        results: [
          {
            contentType: 'api::contentTypeA.contentTypeA',
            entry: {
              id: 1,
              name: 'Test 1'
            },
          },
          {
            contentType: 'api::contentTypeB.contentTypeB',
            entry: {
              id: 2,
              name: 'Test 2'
            },
          },
        ],
        pagination: {},
      });

      // @ts-expect-error Ignore missing properties
      await releaseActionController.findMany(ctx);

      expect(mockSanitizeOutput).toHaveBeenCalledTimes(2);
      expect(mockSanitizeOutput).toHaveBeenCalledWith({ id: 1, name: 'Test 1' });
      expect(mockSanitizeOutput).toHaveBeenCalledWith({ id: 2, name: 'Test 2' });
      // @ts-expect-error Ignore missing properties
      expect(ctx.body.data).toEqual([
        {
          contentType: 'api::contentTypeA.contentTypeA',
          entry: {
            id: 1,
          },
        },
        {
          contentType: 'api::contentTypeB.contentTypeB',
          entry: {
            id: 2,
          },
        }
      ]);
    });

  });
});
