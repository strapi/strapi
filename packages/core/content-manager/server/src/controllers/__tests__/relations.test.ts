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

describe('Relations', () => {
  beforeAll(() => {
    global.strapi = {
      getModel: jest.fn((uid) => {
        return contentTypes[uid];
      }),
      entityService: {
        findPage: jest.fn(),
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
          fields: ['id', 'myField'],
          filters: {
            $and: [
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
          fields: ['id'],
          filters: {
            $and: [
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

      expect(strapi.entityService.load).toHaveBeenCalledWith(
        'main',
        { id: 1 },
        'relation',
        expect.objectContaining({
          fields: ['id', 'myField'],
        })
      );
    });

    test('Replace mainField by id when mainField is not listable', async () => {
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

  test('Replace mainField by id when mainField is not accessible with RBAC', async () => {
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
