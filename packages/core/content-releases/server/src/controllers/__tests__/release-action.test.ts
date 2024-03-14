import { AlreadyOnReleaseError } from '../../services/validation';
import releaseActionController from '../release-action';

const mockSanitizedQueryRead = jest.fn().mockResolvedValue({});
const mockFindActions = jest.fn().mockResolvedValue({ results: [], pagination: {} });
const mockSanitizeOutput = jest.fn((entry: { id: number; name: string }) => ({ id: entry.id }));
const mockCreateAction = jest.fn();

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
    createAction: mockCreateAction,
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

  describe('createMany', () => {
    beforeEach(() => {
      global.strapi = {
        db: {
          transaction: jest.fn((cb) => cb()),
        },
      };

      jest.clearAllMocks();
    });

    it('creates multiple release actions', async () => {
      mockCreateAction.mockResolvedValue({ id: 1 });

      const ctx: any = {
        params: {
          releaseId: 1,
        },
        request: {
          body: [
            {
              entry: {
                id: 1,
                contentType: 'api::contentTypeA.contentTypeA',
              },
              type: 'publish',
            },
            {
              entry: {
                id: 2,
                contentType: 'api::contentTypeB.contentTypeB',
              },
              type: 'unpublish',
            },
          ],
        },
      };

      await releaseActionController.createMany(ctx);

      expect(mockCreateAction).toHaveBeenCalledTimes(2);
      expect(ctx.body.data).toHaveLength(2);
      expect(ctx.body.meta.totalEntries).toBe(2);
      expect(ctx.body.meta.entriesAlreadyInRelease).toBe(0);
    });

    it('should count already added entries and dont throw an error', async () => {
      mockCreateAction.mockRejectedValue(
        new AlreadyOnReleaseError(
          'Entry with id 1 and contentType api::contentTypeA.contentTypeA already exists in release with id 1'
        )
      );

      const ctx: any = {
        params: {
          releaseId: 1,
        },
        request: {
          body: [
            {
              entry: {
                id: 1,
                contentType: 'api::contentTypeA.contentTypeA',
              },
              type: 'publish',
            },
          ],
        },
      };

      await releaseActionController.createMany(ctx);

      expect(mockCreateAction).toHaveBeenCalledTimes(1);
      expect(ctx.body.data).toHaveLength(0);
      expect(ctx.body.meta.totalEntries).toBe(1);
      expect(ctx.body.meta.entriesAlreadyInRelease).toBe(1);
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
