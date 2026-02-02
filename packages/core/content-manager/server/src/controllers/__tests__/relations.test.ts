// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
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

// TODO fix for new relations logic
describe.skip('Relations', () => {
  const findOne: jest.MockedFunction<() => Record<string, any>> = jest.fn(() => ({ id: 1 }));
  const dbFindOne: jest.MockedFunction<() => Record<string, any>> = jest.fn(() => ({ id: 1 }));
  const dbFindPage: jest.MockedFunction<() => Record<string, any[]>> = jest.fn(() => ({
    results: [],
  }));

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
                can: {
                  read: jest.fn().mockReturnValue(true),
                },
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
            'collection-types': {
              findOne: jest.fn(() => ({})),
            },
          },
        },
      },
      db: {
        query: jest.fn().mockReturnValue({
          findOne: dbFindOne,
          findPage: dbFindPage,
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
      global.strapi.plugins['content-manager'].services[
        'permission-checker'
      ].create.mockReturnValue({
        can: {
          read: jest.fn().mockReturnValue(true),
        },
        cannot: {
          read: jest.fn().mockReturnValue(false),
        },
        sanitizedQuery: {
          read: jest.fn((queryParams) => queryParams),
        },
      });

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
        can: {
          read: jest.fn().mockReturnValue(true),
        },
        cannot: {
          read: jest.fn().mockReturnValue(false),
        },
        sanitizedQuery: {
          read: jest.fn((queryParams) => queryParams),
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

      dbFindOne.mockReturnValue({
        id: 1,
        relation: {
          id: 1,
        },
      });

      await relations.findExisting(ctx);

      expect(dbFindPage).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { id: { $in: [1] } },
          orderBy: ['myField', 'documentId'],
          select: ['myField', 'publishedAt', 'documentId'],
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

  test('Replace mainField by id when mainField is not accessible with RBAC', async () => {
    global.strapi.plugins['content-manager'].services['permission-checker'].create
      .mockReturnValueOnce({
        can: {
          read: jest.fn().mockReturnValue(true),
        },
        cannot: {
          read: jest.fn().mockReturnValue(false),
        },
        sanitizedQuery: {
          read: jest.fn().mockReturnValue({}),
        },
      })
      .mockReturnValueOnce({
        can: {
          read: jest.fn().mockReturnValue(false),
        },
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

    expect(strapi.entityService.load).toHaveBeenCalledWith(
      'main',
      { id: 1 },
      'relationWithHidden',
      expect.objectContaining({
        fields: ['id'],
      })
    );
  });
});
