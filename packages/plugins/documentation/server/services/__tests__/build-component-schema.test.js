'use strict';

const _ = require('lodash/fp');
const buildComponentSchema = require('../helpers/build-component-schema');

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
  api: {
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
};

describe('Documentation plugin | Build component schema', () => {
  beforeEach(() => {
    // Reset the mocked strapi instance
    global.strapi = _.cloneDeep(strapi);
  });

  afterAll(() => {
    // Teardown the mocked strapi instance
    global.strapi = {};
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
          test: { type: 'string' },
        },
      },
      UsersPermissionsRoleResponseDataObject: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
        },
      },
      UsersPermissionsRoleResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/UsersPermissionsRoleResponseDataObject',
          },
          meta: {
            type: 'object',
          },
        },
      },
      Restaurant: {
        type: 'object',
        properties: {
          test: { type: 'string' },
        },
      },
      RestaurantResponseDataObject: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/Restaurant',
          },
        },
      },
      RestaurantResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/RestaurantResponseDataObject',
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
    global.strapi.plugins['users-permissions'].routes['content-api'].routes = [
      { method: 'GET', path: '/test', handler: 'test.find' },
    ];
    global.strapi.api.restaurant.routes.restaurant.routes = [
      { method: 'GET', path: '/test', handler: 'test.find' },
    ];

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
          test: { type: 'string' },
        },
      },
      UsersPermissionsRoleListResponseDataItem: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
        },
      },
      UsersPermissionsRoleListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/UsersPermissionsRoleListResponseDataItem',
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
      UsersPermissionsRoleResponseDataObject: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
        },
      },
      UsersPermissionsRoleResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/UsersPermissionsRoleResponseDataObject',
          },
          meta: {
            type: 'object',
          },
        },
      },
      RestaurantListResponseDataItem: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/Restaurant',
          },
        },
      },
      RestaurantListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/RestaurantListResponseDataItem',
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
      RestaurantResponseDataObject: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/Restaurant',
          },
        },
      },
      RestaurantResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/RestaurantResponseDataObject',
          },
          meta: {
            type: 'object',
          },
        },
      },
      Restaurant: {
        type: 'object',
        properties: {
          test: { type: 'string' },
        },
      },
    };

    expect(schemas).toStrictEqual(expectedSchemas);
  });

  it('builds the Request schema', () => {
    global.strapi.plugins['users-permissions'].routes['content-api'].routes = [
      { method: 'POST', path: '/test', handler: 'test.create' },
    ];
    global.strapi.api.restaurant.routes.restaurant.routes = [
      { method: 'POST', path: '/test', handler: 'test.create' },
    ];

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
    }, {});

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

  it('builds the LocalizationResponse schema', () => {
    global.strapi.plugins['users-permissions'].routes['content-api'].routes = [
      { method: 'GET', path: '/localizations', handler: 'test' },
      { method: 'GET', path: '/test', handler: 'test.find' },
    ];
    global.strapi.api.restaurant.routes.restaurant.routes = [
      { method: 'GET', path: '/localizations', handler: 'test' },
      { method: 'GET', path: '/test', handler: 'test.find' },
    ];

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
          test: { type: 'string' },
        },
      },
      UsersPermissionsRoleListResponseDataItem: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
        },
      },
      UsersPermissionsRoleListResponseDataItemLocalized: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
        },
      },
      UsersPermissionsRoleListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/UsersPermissionsRoleListResponseDataItem',
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
      UsersPermissionsRoleLocalizationListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/UsersPermissionsRoleListResponseDataItemLocalized',
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
      UsersPermissionsRoleResponseDataObject: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
        },
      },
      UsersPermissionsRoleResponseDataObjectLocalized: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/UsersPermissionsRole',
          },
        },
      },
      UsersPermissionsRoleResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/UsersPermissionsRoleResponseDataObject',
          },
          meta: {
            type: 'object',
          },
        },
      },
      UsersPermissionsRoleLocalizationResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/UsersPermissionsRoleResponseDataObjectLocalized',
          },
          meta: {
            type: 'object',
          },
        },
      },
      RestaurantListResponseDataItem: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/Restaurant',
          },
        },
      },
      RestaurantListResponseDataItemLocalized: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/Restaurant',
          },
        },
      },
      RestaurantListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/RestaurantListResponseDataItem',
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
      RestaurantLocalizationListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/RestaurantListResponseDataItemLocalized',
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
      RestaurantResponseDataObject: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/Restaurant',
          },
        },
      },
      RestaurantResponseDataObjectLocalized: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            $ref: '#/components/schemas/Restaurant',
          },
        },
      },
      RestaurantLocalizationResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/RestaurantResponseDataObjectLocalized',
          },
          meta: {
            type: 'object',
          },
        },
      },
      RestaurantResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/RestaurantResponseDataObject',
          },
          meta: {
            type: 'object',
          },
        },
      },
      Restaurant: {
        type: 'object',
        properties: {
          test: { type: 'string' },
        },
      },
    };

    expect(schemas).toStrictEqual(expectedSchemas);
  });

  it('builds the LocalizationRequest schema', () => {
    global.strapi.plugins['users-permissions'].routes['content-api'].routes = [
      { method: 'POST', path: '/localizations', handler: 'test' },
    ];
    global.strapi.api.restaurant.routes.restaurant.routes = [
      { method: 'POST', path: '/localizations', handler: 'test' },
    ];

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

    const schemaNames = Object.keys(schemas);
    const pluginListResponseLocalizationRequest = schemas.UsersPermissionsRoleLocalizationRequest;
    const apiListResponseLocalizationRequest = schemas.RestaurantLocalizationRequest;

    const expectedShape = {
      type: 'object',
      required: ['locale'],
      properties: { test: { type: 'string' } },
    };

    expect(schemaNames.includes('UsersPermissionsRoleLocalizationRequest')).toBe(true);
    expect(schemaNames.includes('RestaurantLocalizationRequest')).toBe(true);
    expect(pluginListResponseLocalizationRequest).toStrictEqual(expectedShape);
    expect(apiListResponseLocalizationRequest).toStrictEqual(expectedShape);
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
      'UsersPermissionsPermissionResponseDataObject',
      'UsersPermissionsPermissionResponse',
      'UsersPermissionsRole',
      'UsersPermissionsRoleResponseDataObject',
      'UsersPermissionsRoleResponse',
      'UsersPermissionsUser',
      'UsersPermissionsUserResponseDataObject',
      'UsersPermissionsUserResponse',
    ]);
  });
});
