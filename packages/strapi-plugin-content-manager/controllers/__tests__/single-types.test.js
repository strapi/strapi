'use strict';

const createContext = require('../../../../test/helpers/create-context');
const singleTypes = require('../single-types');
const { ACTIONS } = require('../constants');

describe('Single Types', () => {
  test('find', async () => {
    const state = {
      userAbility: {
        can: jest.fn(),
        cannot: jest.fn(() => false),
      },
    };

    const notFound = jest.fn();
    const createPermissionsManager = jest.fn(() => ({
      ability: state.userAbility,
    }));

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager,
          },
        },
      },
      plugins: {
        'content-manager': {
          services: {
            'single-types': {
              fetchEntitiyWithCreatorRoles() {
                return null;
              },
            },
          },
        },
      },
      entityService: {
        find: jest.fn(),
      },
    };

    const modelUid = 'test-model';

    const ctx = createContext(
      {
        params: {
          model: modelUid,
        },
      },
      { state, notFound }
    );

    await singleTypes.find(ctx);

    expect(state.userAbility.cannot).toHaveBeenCalledWith(ACTIONS.create, modelUid);
    expect(notFound).toHaveBeenCalled();
  });
});
