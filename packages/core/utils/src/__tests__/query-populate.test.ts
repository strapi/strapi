import { traverseQueryPopulate } from '../traverse';

describe('traverseQueryPopulate', () => {
  test('should return an empty object incase no populatable field exists', async () => {
    const query = await traverseQueryPopulate(jest.fn(), {
      schema: {
        kind: 'collectionType',
        attributes: {
          title: {
            type: 'string',
          },
        },
      },
    })('*');

    expect(query).toEqual({});
  });

  test('should return all populatable fields', async () => {
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
              some: 'some',
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
    })('*');

    expect(query).toEqual({ address: true, some: true });
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
    })('address');

    expect(query).toEqual('address');
  });

  test('should populate dynamiczone', async () => {
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
          zone: {
            type: 'dynamiczone',
            components: ['blog.test-como', 'some.another-como'],
          },
        },
      },
    })('*');

    expect(query).toEqual({
      address: true,
      some: true,
      zone: true,
    });
  });

  test('should deep populate dynamiczone components', async () => {
    const strapi = {
      getModel: jest.fn((uid) => {
        if (uid === 'blog.test-como') {
          return {
            uid,
            attributes: {
              street: {
                type: 'string',
              },
              address: {
                type: 'relation',
                relation: 'oneToOne',
                target: 'api::address.address',
              },
            },
          };
        }
        if (uid === 'some.another-como') {
          return {
            uid,
            attributes: {
              street: {
                type: 'string',
              },
              some: {
                type: 'relation',
                relation: 'ManyToMany',
                target: 'api::some.some',
              },
            },
          };
        }
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
          zone: {
            type: 'dynamiczone',
            components: ['blog.test-como', 'some.another-como'],
          },
        },
      },
    })({ zone: { populate: '*' } });

    expect(query).toEqual({
      zone: {
        populate: {
          address: true,
          some: true,
        },
      },
    });
  });
});
