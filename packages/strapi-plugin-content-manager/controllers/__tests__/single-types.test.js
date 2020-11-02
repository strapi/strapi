'use strict';

const createContext = require('../../../../test/helpers/create-context');
const singleTypes = require('../single-types');

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

    const permissionChecker = {
      cannot: {
        read: jest.fn(() => false),
        create: jest.fn(() => false),
      },
    };

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
            entity: {
              find() {
                return Promise.resolve();
              },
              assocCreatorRoles(enitty) {
                return enitty;
              },
            },
            'permission-checker': {
              create() {
                return permissionChecker;
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

    expect(permissionChecker.cannot.read).toHaveBeenCalled();
    expect(permissionChecker.cannot.create).toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });
});
