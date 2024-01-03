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
});
