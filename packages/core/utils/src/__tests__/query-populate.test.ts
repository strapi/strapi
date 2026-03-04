import { traverseQueryPopulate } from '../traverse';
import {
  validatePopulate,
  POPULATE_TRAVERSALS,
  FILTER_TRAVERSALS,
  SORT_TRAVERSALS,
  FIELDS_TRAVERSALS,
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
   * When qs parses a populate array with more entries than its arrayLimit (default 100 in Strapi),
   * it produces a plain object with numeric string keys instead of an array:
   *   { "0": "createdBy", "1": "updatedBy", "2": "createdBy" }
   *
   * The traverse should handle these array-like objects the same as actual arrays.
   */
  describe('array-like objects (qs arrayLimit exceeded)', () => {
    const schema = {
      kind: 'collectionType' as const,
      attributes: {
        title: { type: 'string' as const },
        createdBy: {
          type: 'relation' as const,
          relation: 'oneToOne' as const,
          target: 'admin::user',
        },
        updatedBy: {
          type: 'relation' as const,
          relation: 'oneToOne' as const,
          target: 'admin::user',
        },
      },
    };

    const getModel = jest.fn((uid: string) => {
      if (uid === 'admin::user') {
        return {
          uid: 'admin::user',
          attributes: {
            id: { type: 'integer' },
            firstname: { type: 'string' },
          },
        };
      }
      return schema;
    });

    beforeEach(() => {
      global.strapi = {
        getModel,
        db: {
          metadata: {
            get: jest.fn(() => ({
              columnToAttribute: {},
            })),
          },
        },
      } as any;
    });

    test('traverseQueryPopulate should handle an object with numeric keys like an array', async () => {
      // Simulate what qs produces when arrayLimit is exceeded
      const populateAsObject = { '0': 'createdBy', '1': 'updatedBy', '2': 'createdBy' };

      const visitor = jest.fn();
      const result = await traverseQueryPopulate(visitor, {
        schema,
        getModel,
      })(populateAsObject);

      // Should not throw and should process all entries
      expect(result).toBeDefined();
    });

    test('validatePopulate should not throw for an object with numeric string keys', async () => {
      // This is what qs produces when populate has >100 entries
      const populateAsObject: Record<string, string> = {};
      for (const key of [0, 1, 2]) {
        populateAsObject[String(key)] = 'createdBy';
      }

      await expect(
        validatePopulate({ schema, getModel }, populateAsObject, {
          filters: FILTER_TRAVERSALS,
          sort: SORT_TRAVERSALS,
          fields: FIELDS_TRAVERSALS,
          populate: POPULATE_TRAVERSALS,
        })
      ).resolves.not.toThrow();
    });
  });
});
