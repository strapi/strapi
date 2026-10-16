import type Koa from 'koa';

import releaseActionController from '../release-action';

const mockSanitizedQueryRead = jest.fn().mockResolvedValue({});
const mockFindActions = jest.fn().mockResolvedValue({ results: [], pagination: {} });
const mockSanitizeOutput = jest.fn((entry: { id: number; name: string }) => ({ id: entry.id }));
const mockCreateAction = jest.fn();
const mockCreateManyActions = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    create: mockCreateAction,
    createMany: mockCreateManyActions,
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
      global.strapi = {} as unknown as typeof global.strapi;

      jest.clearAllMocks();
    });

    it('returns the created actions and counts the entries already in the release', async () => {
      // One of the two entries was already in the release
      mockCreateManyActions.mockResolvedValue({ created: [{ id: 1 }], alreadyInRelease: 1 });

      const created = jest.fn();
      const ctx = {
        params: {
          releaseId: 1,
        },
        created,
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
      } as unknown as Koa.Context;

      await releaseActionController.createMany(ctx);

      expect(created).toHaveBeenCalledWith({
        data: [{ id: 1 }],
        meta: { totalEntries: 2, entriesAlreadyInRelease: 1 },
      });
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
