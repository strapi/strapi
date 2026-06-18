import { traverseQueryPopulate } from '../traverse';
import {
  defaultValidatePopulate,
  POPULATE_TRAVERSALS,
  FILTER_TRAVERSALS,
  SORT_TRAVERSALS,
  FIELDS_TRAVERSALS,
  validatePopulate,
} from '../validate/validators';

describe('traverseQueryPopulate', () => {
  global.strapi = {
    getModel() {},
  } as any;

  test('should not modify wildcard', async () => {
    const strapi = {
      getModel: jest.fn((uid) => {
        return {
          uid,
          attributes: {
            street: {
              type: 'string',
            },
          },
        };
      }),
      db: {
        metadata: {
          get: jest.fn(() => ({
            columnToAttribute: {
              address: 'address',
            },
          })),
        },
      },
    } as any;

    global.strapi = strapi;

    const query = await traverseQueryPopulate(jest.fn(), {
      schema: {
        kind: 'collectionType',
        attributes: {
          title: {
            type: 'string',
          },
          address: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
          },
          some: {
            type: 'relation',
            relation: 'ManyToMany',
            target: 'api::some.some',
          },
        },
      },
      getModel() {},
    })('*');

    expect(query).toEqual('*');
  });

  test('should return only selected populatable field', async () => {
    const strapi = {
      getModel: jest.fn((uid) => {
        return {
          uid,
          attributes: {
            street: {
              type: 'string',
            },
          },
        };
      }),
      db: {
        metadata: {
          get: jest.fn(() => ({
            columnToAttribute: {
              address: 'address',
            },
          })),
        },
      },
    } as any;

    global.strapi = strapi;

    const query = await traverseQueryPopulate(jest.fn(), {
      schema: {
        kind: 'collectionType',
        attributes: {
          title: {
            type: 'string',
          },
          address: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::address.address',
          },
          some: {
            type: 'relation',
            relation: 'ManyToMany',
            target: 'api::some.some',
          },
        },
      },
      getModel() {},
    })('address');

    expect(query).toEqual('address');
  });

  test('should not recurse into component attribute named "filters" in nested populate context', async () => {
    // Regression test for issue #21338: when a component attribute is named "filters",
    // the traverse should NOT recurse into it when it's being used as a query keyword
    // in a nested populate context (parent is an attribute).
    const visitedKeys: string[] = [];

    const strapi = {
      getModel: jest.fn((uid) => {
        if (uid === 'api::vdp.vdp') {
          return {
            uid,
            attributes: {
              name: { type: 'string' },
              filters: { type: 'component', component: 'default.filter-compo' },
            },
          };
        }
        if (uid === 'default.filter-compo') {
          return {
            uid,
            attributes: {
              label: { type: 'string' },
            },
          };
        }
        return { uid, attributes: {} };
      }),
      db: {
        metadata: {
          get: jest.fn(() => ({
            columnToAttribute: {},
          })),
        },
      },
    } as any;

    global.strapi = strapi;

    const schema = {
      kind: 'collectionType',
      attributes: {
        title: { type: 'string' },
        searchResultsPage: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::vdp.vdp',
        },
      },
    } as const;

    const ctx = {
      schema,
      getModel: strapi.getModel,
    } as const;

    await traverseQueryPopulate(({ key }) => {
      visitedKeys.push(key);
    }, ctx)({
      searchResultsPage: {
        filters: {
          publishedAt: { $null: true },
        },
      },
    });

    // The visitor should see 'searchResultsPage' and 'filters',
    // but should NOT recurse into the component and visit 'publishedAt'
    expect(visitedKeys).toContain('searchResultsPage');
    expect(visitedKeys).toContain('filters');
    expect(visitedKeys).not.toContain('publishedAt');
  });

  test('should work with filters attribute', async () => {
    expect.assertions(5);

    const strapi = {
      getModel: jest.fn((uid) => {
        return {
          uid,
          attributes: {
            filters: {
              type: 'string',
            },
          },
        };
      }),
      db: {
        metadata: {
          get: jest.fn(() => ({
            columnToAttribute: {
              address: 'address',
            },
          })),
        },
      },
    } as any;

    global.strapi = strapi;

    const schema = {
      kind: 'collectionType',
      attributes: {
        title: {
          type: 'string',
        },
        address: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::address.address',
        },
      },
    } as const;

    const ctx = {
      schema,
      getModel: strapi.getModel,
    } as const;

    await traverseQueryPopulate(({ key, parent, attribute }) => {
      switch (key) {
        case 'address':
          // top level populate should not have parent
          expect(parent).toBeUndefined();
          expect(attribute).toBeDefined();
          break;
        case 'filters':
          // Parent information should be available
          expect(parent.key).toBe('address');
          expect(parent.attribute).not.toBeUndefined();
          expect(attribute).toBeDefined();
          break;
        default:
          break;
      }
    }, ctx)({
      address: {
        filters: {
          name: 'test',
        },
      },
    });
  });

  /**
   * When qs parses indexed populate keys beyond arrayLimit (default 100), populate is a plain
   * object with consecutive numeric string keys instead of an array. Validation runs on that
   * shape before convert-query-params — see #25632 / PR #25916.
   */
  describe('qs arrayLimit exceeded (indexed populate notation)', () => {
    const schema = {
      kind: 'collectionType' as const,
      attributes: {
        title: { type: 'string' as const },
        slug: { type: 'string' as const },
      },
    };

    const getModel = jest.fn(() => schema);

    const populateAsQsObject = Object.fromEntries(
      Array.from({ length: 101 }, (_, index) => [String(index), `field${index}`])
    );

    beforeEach(() => {
      global.strapi = { getModel } as any;
    });

    test('defaultValidatePopulate throws a clear arrayLimit error', async () => {
      await expect(
        defaultValidatePopulate({ schema, getModel }, populateAsQsObject)
      ).rejects.toThrow(
        'Too many populate entries (101). The maximum number of populate entries when using array notation is 100.'
      );
    });

    test('validatePopulate does not throw the misleading Invalid key 2 error', async () => {
      await expect(
        validatePopulate({ schema, getModel }, populateAsQsObject, {
          filters: FILTER_TRAVERSALS,
          sort: SORT_TRAVERSALS,
          fields: FIELDS_TRAVERSALS,
          populate: POPULATE_TRAVERSALS,
        })
      ).rejects.not.toThrow(/Invalid key 2/);
    });
  });
});
