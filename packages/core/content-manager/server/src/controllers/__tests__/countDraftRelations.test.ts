// @ts-expect-error - test helper
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import controller from '../collection-types';

describe('countDraftRelations', () => {
  beforeEach(() => {
    global.strapi = {
      getModel: jest.fn().mockReturnValue({
        uid: 'test-model',
        attributes: {},
      }),
      plugins: {
        'content-manager': {
          services: {
            'permission-checker': {
              create: jest.fn().mockReturnValue({
                cannot: {
                  read: jest.fn().mockReturnValue(false),
                },
                requiresEntity: {
                  read: jest.fn().mockReturnValue(true),
                },
                sanitizedQuery: {
                  read: jest.fn().mockResolvedValue({}),
                },
              }),
            },
            'populate-builder': () => ({
              populateFromQuery: jest.fn().mockReturnThis(),
              build: jest.fn().mockResolvedValue({ some: 'populate' }),
            }),
            'document-manager': {
              findOne: jest.fn().mockResolvedValue({ id: 1, createdBy: { id: 1 } }),
              countDraftRelations: jest.fn().mockResolvedValue(3),
            },
          },
        },
      },
    } as any;
  });

  it('should return count without 403 when RBAC conditions are enabled', async () => {
    const ctx = createContext(
      {
        params: {
          model: 'test-model',
          id: 1,
        },
        query: {},
      },
      {
        state: {
          userAbility: {},
        },
      }
    );

    const res = await controller.countDraftRelations(ctx);

    expect(res.data).toBe(3);
  });
});
