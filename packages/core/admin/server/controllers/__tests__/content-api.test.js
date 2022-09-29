'use strict';

const createContext = require('../../../../../../test/helpers/create-context');
const contentApiController = require('../content-api');

describe('Content API permissions', () => {
  const actionsMap = {
    'api::address': {
      controllers: {
        address: ['find', 'findOne'],
      },
    },
    'api::category': {
      controllers: {
        category: ['find', 'findOne', 'create', 'update', 'delete', 'createLocalization'],
      },
    },
  };

  test('return content api layout successfully', async () => {
    const getActionsMap = jest.fn().mockResolvedValue(actionsMap);
    const send = jest.fn();
    const ctx = createContext({}, { send });

    global.strapi = {
      contentAPI: {
        permissions: {
          getActionsMap,
        },
      },
    };

    await contentApiController.getPermissions(ctx);

    expect(getActionsMap).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({ data: actionsMap });
  });

  const routesMap = {
    'api::address': [
      {
        method: 'GET',
        path: '/api/addresses',
        handler: 'api::address.address.find',
        config: {
          auth: false,
        },
        info: {
          apiName: 'address',
          type: 'content-api',
        },
      },
      {
        method: 'GET',
        path: '/api/addresses/:id',
        handler: 'api::address.address.findOne',
        config: {
          auth: {
            scope: ['api::address.address.findOne'],
          },
        },
        info: {
          apiName: 'address',
          type: 'content-api',
        },
      },
    ],
    'api::category': [
      {
        method: 'GET',
        path: '/api/categories',
        handler: 'api::category.category.find',
        config: {
          auth: {
            scope: ['api::category.category.find'],
          },
        },
        info: {
          apiName: 'category',
          type: 'content-api',
        },
      },
      {
        method: 'GET',
        path: '/api/categories/:id',
        handler: 'api::category.category.findOne',
        config: {
          auth: {
            scope: ['api::category.category.findOne'],
          },
        },
        info: {
          apiName: 'category',
          type: 'content-api',
        },
      },
      {
        method: 'POST',
        path: '/api/categories',
        handler: 'api::category.category.create',
        config: {
          auth: {
            scope: ['api::category.category.create'],
          },
        },
        info: {
          apiName: 'category',
          type: 'content-api',
        },
      },
      {
        method: 'PUT',
        path: '/api/categories/:id',
        handler: 'api::category.category.update',
        config: {
          auth: {
            scope: ['api::category.category.update'],
          },
        },
        info: {
          apiName: 'category',
          type: 'content-api',
        },
      },
      {
        method: 'DELETE',
        path: '/api/categories/:id',
        handler: 'api::category.category.delete',
        config: {
          auth: {
            scope: ['api::category.category.delete'],
          },
        },
        info: {
          apiName: 'category',
          type: 'content-api',
        },
      },
      {
        method: 'POST',
        path: '/api/categories/:id/localizations',
        handler: 'category.createLocalization',
        config: {
          policies: [],
          auth: {
            scope: ['api::category.category.createLocalization'],
          },
        },
        info: {
          apiName: 'category',
          type: 'content-api',
        },
      },
    ],
  };

  test('return content api routes successfully', async () => {
    const getRoutesMap = jest.fn().mockResolvedValue(routesMap);
    const send = jest.fn();
    const ctx = createContext({}, { send });

    global.strapi = {
      contentAPI: {
        getRoutesMap,
      },
    };

    await contentApiController.getRoutes(ctx);

    expect(getRoutesMap).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({ data: routesMap });
  });
});
