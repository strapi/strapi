import { traverseQueryPopulate } from '../traverse';

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
});
