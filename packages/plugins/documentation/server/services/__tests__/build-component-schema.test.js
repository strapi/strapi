'use strict';

const _ = require('lodash');
const buildComponentSchema = require('../helpers/build-component-schema');
const strapi = require('../__mocks__/strapi');

describe('Build Component Schema', () => {
  beforeEach(() => {
    // Reset the mocked strapi instance
    global.strapi = _.cloneDeep(strapi);
    global.strapi.plugin = jest.fn((name) => _.get(global.strapi.plugins, name));
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
      UsersPermissionsRoleResponseDataObject: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
      UsersPermissionsRoleResponse: {
        properties: {
          data: {
            $ref: '#/components/schemas/UsersPermissionsRoleResponseDataObject',
          },
          meta: {
            type: 'object',
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
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
      RestaurantResponse: {
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
      UsersPermissionsRoleListResponseDataItem: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
          },
          attributes: {
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
      UsersPermissionsRoleListResponse: {
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
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
      UsersPermissionsRoleResponse: {
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
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
      RestaurantListResponse: {
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
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
      RestaurantResponse: {
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
            required: [],
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
            required: [],
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
    ];
    global.strapi.api.restaurant.routes.restaurant.routes = [
      { method: 'GET', path: '/localizations', handler: 'test' },
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
    const pluginListLocalizationResponseValue = schemas.UsersPermissionsRoleLocalizationResponse;
    const apiListLocalizationResponseValue = schemas.RestaurantLocalizationResponse;

    const expectedShape = {
      type: 'object',
      properties: {
        id: { type: 'number' },
        test: { type: 'string' },
      },
    };

    expect(schemaNames.includes('UsersPermissionsRoleLocalizationResponse')).toBe(true);
    expect(schemaNames.includes('RestaurantLocalizationResponse')).toBe(true);
    expect(pluginListLocalizationResponseValue).toStrictEqual(expectedShape);
    expect(apiListLocalizationResponseValue).toStrictEqual(expectedShape);
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
      'UsersPermissionsPermissionResponseDataObject',
      'UsersPermissionsPermissionResponse',
      'UsersPermissionsRoleResponseDataObject',
      'UsersPermissionsRoleResponse',
      'UsersPermissionsUserResponseDataObject',
      'UsersPermissionsUserResponse',
    ]);
  });
});
