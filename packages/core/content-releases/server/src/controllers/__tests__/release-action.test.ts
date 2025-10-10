import { AlreadyOnReleaseError } from '../../services/validation';
import releaseActionController from '../release-action';

const mockSanitizedQueryRead = jest.fn().mockResolvedValue({});
const mockFindActions = jest.fn().mockResolvedValue({ results: [], pagination: {} });
const mockSanitizeOutput = jest.fn((entry: { id: number; name: string }) => ({ id: entry.id }));
const mockCreateAction = jest.fn();
const mockUpdateReleaseStatus = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    create: mockCreateAction,
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
    updateReleaseStatus: mockUpdateReleaseStatus,
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
            entryDocumentId: '1',
            contentType: 'api::category.category',
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
        created: jest.fn(),
        request: {
          body: [
            {
              entryDocumentId: 'abcd',
              contentType: 'api::contentTypeA.contentTypeA',
              type: 'publish',
            },
            {
              entryDocumentId: 'abcde',
              contentType: 'api::contentTypeB.contentTypeB',
              type: 'unpublish',
            },
          ],
        },
      };

      await releaseActionController.createMany(ctx);

      expect(mockCreateAction).toHaveBeenCalledTimes(2);

      expect(ctx.created).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Array), // Ensure data is an array
          meta: expect.objectContaining({
            totalEntries: 2,
            entriesAlreadyInRelease: 0,
          }),
        })
      );
      const firstCallArgument = ctx.created.mock.calls[0][0];
      expect(firstCallArgument.data.length).toBe(2);
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
        created: jest.fn(),
        request: {
          body: [
            {
              entryDocumentId: 'abcd',
              contentType: 'api::contentTypeA.contentTypeA',
              type: 'publish',
            },
          ],
        },
      };

      await releaseActionController.createMany(ctx);

      expect(mockCreateAction).toHaveBeenCalledTimes(1);
      expect(ctx.created).toHaveBeenCalledWith({
        data: [],
        meta: { totalEntries: 1, entriesAlreadyInRelease: 1 },
      });
    });

    it('should call updateReleaseStatus only once', async () => {
      mockCreateAction.mockResolvedValue({ id: 1 });
      mockUpdateReleaseStatus.mockResolvedValue({ id: 1 });

      const ctx: any = {
        params: {
          releaseId: 1,
        },
        created: jest.fn(),
        request: {
          body: [
            {
              entryDocumentId: 'abcd1',
              contentType: 'api::contentTypeA.contentTypeA',
              type: 'publish',
            },
            {
              entryDocumentId: 'abcd2',
              contentType: 'api::contentTypeA.contentTypeA',
              type: 'publish',
            },
          ],
        },
      };

      await releaseActionController.createMany(ctx);

      expect(mockUpdateReleaseStatus).toHaveBeenCalledTimes(1);
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
