// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../test/helpers/create-context';
import relations from '../relations';

const contentTypes = {
  main: {
    uid: 'main',
    attributes: {
      relation: { type: 'relation', target: 'target' },
      relationWithHidden: { type: 'relation', target: 'targetWithHidden' },
    },
  },
  targetWithHidden: {
    uid: 'targetWithHidden',
    attributes: { myField: { type: 'string' } },
    config: {
      attributes: {
        myField: {
          hidden: true,
        },
      },
    },
  },
  target: {
    uid: 'target',
    attributes: { myField: { type: 'string' } },
  },
} as any;

describe('Relations', () => {
  const findOne: jest.MockedFunction<() => Record<string, any>> = jest.fn(() => ({ id: 1 }));
  beforeAll(() => {
    global.strapi = {
      getModel: jest.fn((uid) => {
        return contentTypes[uid];
      }),
      entityService: {
        findOne,
        findPage: jest.fn(() => ({ results: [] })),
        load: jest.fn(),
      },
      plugins: {
        'content-manager': {
          services: {
            'permission-checker': {
              create: jest.fn().mockReturnValue({
                cannot: {
                  read: jest.fn().mockReturnValue(false),
                },
                sanitizedQuery: {
                  read: jest.fn().mockReturnValue({}),
                },
              }),
            },
            'populate-builder': () => ({
              populateFromQuery: jest.fn().mockReturnThis(),
              build: jest.fn().mockReturnValue({}),
            }),
            'content-types': {
              findConfiguration: jest.fn().mockReturnValue({
                metadatas: {
                  relation: {
                    edit: {
                      mainField: 'myField',
                    },
                  },
                },
              }),
            },
            'entity-manager': {
              findOne: jest.fn(() => ({})),
            },
          },
        },
      },
      db: {
        query: jest.fn().mockReturnValue({
          findOne: jest.fn(() => ({ id: 1 })),
        }),
      },
    } as any;
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('findAvailable', () => {
    test('Query mainField when mainField is listable', async () => {
      const ctx = createContext(
        {
          params: {
            model: 'main',
            targetField: 'relation',
          },
          query: {
            _q: 'foobar',
          },
        },
        {
          state: {
            userAbility: {
              can: jest.fn().mockReturnValue(false),
            },
          },
        }
      );

      await relations.findAvailable(ctx);

      expect(strapi.entityService.findPage).toHaveBeenCalledWith(
        'target',
        expect.objectContaining({
          sort: 'myField',
          fields: ['myField', 'publishedAt', 'documentId'],
          filters: {
            $and: [
              { publishedAt: null },
              {
                myField: {
                  $containsi: 'foobar',
                },
              },
            ],
          },
        })
      );
    });

    test('Replace mainField by id when mainField is not listable', async () => {
      const ctx = createContext(
        {
          params: {
            model: 'main',
            targetField: 'relationWithHidden',
          },
          query: {
            _q: 'foobar',
          },
        },
        {
          state: {
            userAbility: {
              can: jest.fn().mockReturnValue(false),
            },
          },
        }
      );

      await relations.findAvailable(ctx);

      expect(strapi.entityService.findPage).toHaveBeenCalledWith(
        'targetWithHidden',
        expect.objectContaining({
          sort: 'id',
          fields: ['id', 'publishedAt', 'documentId'],
          filters: {
            $and: [
              { publishedAt: null },
              {
                id: {
                  $containsi: 'foobar',
                },
              },
            ],
          },
        })
      );
    });
  });

  describe('findExisting', () => {
    test('Query mainField when mainField is listable', async () => {
      global.strapi.plugins['content-manager'].services[
        'permission-checker'
      ].create.mockReturnValue({
        cannot: {
          read: jest.fn().mockReturnValue(false),
        },
        sanitizedQuery: {
          read: jest.fn((queryParams) => queryParams),
        },
      });

      findOne.mockReturnValueOnce({
        id: 1,
        relation: {
          id: 1,
        },
      });

      const ctx = createContext(
        {
          params: {
            model: 'main',
            targetField: 'relation',
            id: 1,
          },
          query: {
            _q: 'foobar',
          },
        },
        {
          state: {
            userAbility: {
              can: jest.fn().mockReturnValue(false),
            },
          },
        }
      );

      await relations.findExisting(ctx);

      expect(strapi.entityService.findPage).toHaveBeenCalledWith(
        'target',
        expect.objectContaining({
          sort: ['myField:ASC', 'documentId:ASC'],
          fields: ['myField', 'publishedAt', 'documentId'],
          filters: { id: { $in: [1] } },
        })
      );
    });

    // TODO hidden fields?
    test.skip('Replace mainField by id when mainField is not listable', async () => {
      const ctx = createContext(
        {
          params: {
            model: 'main',
            targetField: 'relationWithHidden',
            id: 1,
          },
        },
        {
          state: {
            userAbility: {
              can: jest.fn().mockReturnValue(false),
            },
          },
        }
      );

      findOne.mockReturnValueOnce({
        id: 1,
        targetField: {
          id: 1,
        },
      });

      await relations.findExisting(ctx);

      expect(strapi.entityService.findPage).toHaveBeenCalledWith(
        'targetWithHidden',
        expect.objectContaining({
          fields: ['id', 'publishedAt', 'documentId'],
          filters: { id: { $in: [1] } },
          sort: ['documentId:ASC'],
        })
      );
    });

    test.skip('Replace mainField by id when mainField is not accessible with RBAC', async () => {
      global.strapi.plugins['content-manager'].services['permission-checker'].create
        .mockReturnValueOnce({
          cannot: {
            read: jest.fn().mockReturnValue(false),
          },
          sanitizedQuery: {
            read: jest.fn().mockReturnValue({}),
          },
        })
        .mockReturnValueOnce({
          cannot: {
            read: jest.fn().mockReturnValue(true),
          },
        });

      const ctx = createContext(
        {
          params: {
            model: 'main',
            targetField: 'relationWithHidden',
            id: 1,
          },
        },
        {
          state: {
            userAbility: {
              can: jest.fn().mockReturnValue(true),
            },
          },
        }
      );

      await relations.findExisting(ctx);

      expect(strapi.entityService.findPage).toHaveBeenCalledWith(
        'targetWithHidden',
        expect.objectContaining({
          fields: ['id', 'publishedAt', 'documentId'],
          filters: {
            targetWithHidden: {
              $and: [
                {
                  id: 1,
                },
                {
                  locale: null,
                },
                {
                  publishedAt: null,
                },
              ],
            },
          },
          sort: ['documentId:ASC'],
        })
      );
    });
  });
});
