import _ from 'lodash/fp';
import buildComponentSchema from '../helpers/build-component-schema';

const strapi = {
  plugins: {
    'users-permissions': {
      contentTypes: {
        role: {
          attributes: {
            test: {
              type: 'string',
            },
          },
        },
      },
      routes: {
        'content-api': {
          routes: [],
        },
      },
    },
  },
  apis: {
    restaurant: {
      contentTypes: {
        restaurant: {
          attributes: {
            test: {
              type: 'string',
            },
          },
        },
      },
      routes: {
        restaurant: { routes: [] },
      },
    },
  },
  contentType: () => ({ info: {}, attributes: { test: { type: 'string' } } }),
} as any;

describe('Documentation plugin | Build component schema', () => {
  beforeEach(() => {
    // Reset the mocked strapi instance
    global.strapi = _.cloneDeep(strapi);
  });

  afterAll(() => {
    // Teardown the mocked strapi instance
    global.strapi = {} as any;
  });

  it('builds the Response schema', () => {
    const apiMocks = [
      {
        name: 'users-permissions',
        getter: 'plugin',
        ctNames: ['role'],
      },
      { name: 'restaurant', getter: 'api', ctNames: ['restaurant'] },
    ];

    let schemas = {};
    for (const mock of apiMocks) {
      schemas = {
        ...schemas,
        ...buildComponentSchema(mock),
      };
    }

    const expectedSchemas = {
      UsersPermissionsRole: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          documentId: {
            type: 'string',
          },
          test: { type: 'string' },
        },
      },
      UsersPermissionsRoleResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
          meta: {
            type: 'object',
          },
        },
      },
      Restaurant: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          documentId: {
            type: 'string',
          },
          test: { type: 'string' },
        },
      },
      RestaurantResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/Restaurant',
          },
          meta: {
            type: 'object',
          },
        },
      },
    };

    expect(schemas).toStrictEqual(expectedSchemas);
  });

  it('builds the ResponseList schema', () => {
    (global.strapi.plugins['users-permissions'].routes as any)['content-api'].routes = [
      { method: 'GET', path: '/test', handler: 'test.find' },
    ];
    global.strapi.apis.restaurant.routes.restaurant.routes = [
      { method: 'GET', path: '/test', handler: 'test.find' },
    ] as any;

    const apiMocks = [
      {
        name: 'users-permissions',
        getter: 'plugin',
        ctNames: ['role'],
      },
      { name: 'restaurant', getter: 'api', ctNames: ['restaurant'] },
    ];

    let schemas = {};
    for (const mock of apiMocks) {
      schemas = {
        ...schemas,
        ...buildComponentSchema(mock),
      };
    }

    const expectedSchemas = {
      UsersPermissionsRole: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          documentId: {
            type: 'string',
          },
          test: { type: 'string' },
        },
      },
      UsersPermissionsRoleListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/UsersPermissionsRole',
            },
          },
          meta: {
            type: 'object',
            properties: {
              pagination: {
                type: 'object',
                properties: {
                  page: {
                    type: 'integer',
                  },
                  pageSize: {
                    type: 'integer',
                    minimum: 25,
                  },
                  pageCount: {
                    type: 'integer',
                    maximum: 1,
                  },
                  total: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
      },
      UsersPermissionsRoleResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
          meta: {
            type: 'object',
          },
        },
      },
      RestaurantListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Restaurant',
            },
          },
          meta: {
            type: 'object',
            properties: {
              pagination: {
                type: 'object',
                properties: {
                  page: {
                    type: 'integer',
                  },
                  pageSize: {
                    type: 'integer',
                    minimum: 25,
                  },
                  pageCount: {
                    type: 'integer',
                    maximum: 1,
                  },
                  total: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
      },
      RestaurantResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/Restaurant',
          },
          meta: {
            type: 'object',
          },
        },
      },
      Restaurant: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          documentId: {
            type: 'string',
          },
          test: { type: 'string' },
        },
      },
    };

    expect(schemas).toStrictEqual(expectedSchemas);
  });

  it('builds the Request schema', () => {
    (global.strapi.plugins['users-permissions'].routes as any)['content-api'].routes = [
      { method: 'POST', path: '/test', handler: 'test.create' },
    ];
    global.strapi.apis.restaurant.routes.restaurant.routes = [
      { method: 'POST', path: '/test', handler: 'test.create' },
    ] as any;

    const apiMocks = [
      {
        name: 'users-permissions',
        getter: 'plugin',
        ctNames: ['role'],
      },
      { name: 'restaurant', getter: 'api', ctNames: ['restaurant'] },
    ];

    let schemas = {};
    for (const mock of apiMocks) {
      schemas = {
        ...schemas,
        ...buildComponentSchema(mock),
      };
    }
    // Just get the request objects
    const requestObjectsSchemas = Object.entries(schemas).reduce((acc, curr) => {
      const [key, val] = curr;
      if (key.endsWith('Request')) {
        acc[key] = val;
      }

      return acc;
    }, {} as any);

    const expectedSchemas = {
      UsersPermissionsRoleRequest: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
      RestaurantRequest: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    expect(requestObjectsSchemas).toStrictEqual(expectedSchemas);
  });

  it('creates the correct name given multiple content types', () => {
    const apiMock = {
      name: 'users-permissions',
      getter: 'plugin',
      ctNames: ['permission', 'role', 'user'],
    };

    const schemas = buildComponentSchema(apiMock);
    const schemaNames = Object.keys(schemas);
    expect(schemaNames).toStrictEqual([
      'UsersPermissionsPermission',
      'UsersPermissionsPermissionResponse',
      'UsersPermissionsRole',
      'UsersPermissionsRoleResponse',
      'UsersPermissionsUser',
      'UsersPermissionsUserResponse',
    ]);
  });
});
