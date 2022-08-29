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
});
