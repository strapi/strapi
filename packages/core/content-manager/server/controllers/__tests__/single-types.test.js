'use strict';

const createContext = require('../../../../../../test/helpers/create-context');
const singleTypes = require('../single-types');

describe('Single Types', () => {
  test('Successfull find', async () => {
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
      buildReadQuery: jest.fn((query) => query),
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
            'entity-manager': {
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

  test('Successfull create', async () => {
    const modelUid = 'test-uid';

    const state = {
      userAbility: {
        can: jest.fn(),
        cannot: jest.fn(() => false),
      },
      user: {
        id: 1,
        email: 'someTestEmailString',
      },
    };

    const createPermissionsManager = jest.fn(() => ({
      ability: state.userAbility,
    }));

    const permissionChecker = {
      cannot: {
        update: jest.fn(() => false),
        create: jest.fn(() => false),
      },
      sanitizeCreateInput: (obj) => obj,
      sanitizeOutput: (obj) => obj,
      buildReadQuery: jest.fn((query) => query),
    };

    const createFn = jest.fn(() => ({}));
    const sendTelemetry = jest.fn(() => ({}));

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager,
          },
        },
      },
      getModel() {
        return {
          options: {
            draftAndPublish: true,
          },
          attributes: {
            title: {
              type: 'string',
            },
          },
        };
      },
      plugins: {
        'content-manager': {
          services: {
            'entity-manager': {
              find() {
                return Promise.resolve();
              },
              assocCreatorRoles(enitty) {
                return enitty;
              },
              create: createFn,
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
      telemetry: {
        send: sendTelemetry,
      },
    };

    const ctx = createContext(
      {
        params: {
          model: modelUid,
        },
        body: {
          title: 'test',
        },
      },
      { state }
    );

    await singleTypes.createOrUpdate(ctx);

    expect(permissionChecker.cannot.create).toHaveBeenCalled();

    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'test',
        createdBy: 1,
        updatedBy: 1,
      }),
      modelUid,
      { params: {} }
    );

    expect(sendTelemetry).toHaveBeenCalledWith('didCreateFirstContentTypeEntry', {
      eventProperties: {
        model: modelUid,
      },
    });
  });

  test('Successfull delete', async () => {
    const modelUid = 'test-uid';

    const entity = {
      id: 1,
      title: 'entityTitle',
    };

    const state = {
      userAbility: {
        can: jest.fn(),
        cannot: jest.fn(() => false),
      },
      user: {
        id: 1,
      },
    };

    const createPermissionsManager = jest.fn(() => ({
      ability: state.userAbility,
    }));

    const permissionChecker = {
      cannot: {
        delete: jest.fn(() => false),
      },
      sanitizeOutput: jest.fn((obj) => obj),
      buildReadQuery: jest.fn((query) => query),
    };

    const deleteFn = jest.fn(() => ({}));

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager,
          },
        },
      },
      getModel() {
        return {
          options: {
            draftAndPublish: true,
          },
          attributes: {
            title: {
              type: 'string',
            },
          },
        };
      },
      plugins: {
        'content-manager': {
          services: {
            'entity-manager': {
              find() {
                return Promise.resolve(entity);
              },
              assocCreatorRoles(enitty) {
                return enitty;
              },
              delete: deleteFn,
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

    const ctx = createContext(
      {
        params: {
          id: entity.id,
          model: modelUid,
        },
      },
      { state }
    );

    await singleTypes.delete(ctx);

    expect(deleteFn).toHaveBeenCalledWith(entity, modelUid);
    expect(permissionChecker.cannot.delete).toHaveBeenCalledWith(entity);
    expect(permissionChecker.sanitizeOutput).toHaveBeenCalled();
  });

  test('Successfull publish', async () => {
    const modelUid = 'test-uid';

    const entity = {
      id: 1,
      title: 'entityTitle',
    };

    const state = {
      userAbility: {
        can: jest.fn(),
        cannot: jest.fn(() => false),
      },
      user: {
        id: 1,
      },
    };

    const createPermissionsManager = jest.fn(() => ({
      ability: state.userAbility,
    }));

    const permissionChecker = {
      cannot: {
        publish: jest.fn(() => false),
      },
      sanitizeOutput: jest.fn((obj) => obj),
      buildReadQuery: jest.fn((query) => query),
    };

    const publishFn = jest.fn(() => ({}));

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager,
          },
        },
      },
      getModel() {
        return {
          options: {
            draftAndPublish: true,
          },
          attributes: {
            title: {
              type: 'string',
            },
          },
        };
      },
      plugins: {
        'content-manager': {
          services: {
            'entity-manager': {
              find() {
                return Promise.resolve(entity);
              },
              assocCreatorRoles(enitty) {
                return enitty;
              },
              publish: publishFn,
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

    const ctx = createContext(
      {
        params: {
          id: entity.id,
          model: modelUid,
        },
      },
      { state }
    );

    await singleTypes.publish(ctx);

    expect(publishFn).toHaveBeenCalledWith(entity, { updatedBy: state.user.id }, modelUid);
    expect(permissionChecker.cannot.publish).toHaveBeenCalledWith(entity);
    expect(permissionChecker.sanitizeOutput).toHaveBeenCalled();
  });

  test('Successfull unpublish', async () => {
    const modelUid = 'test-uid';

    const entity = {
      id: 1,
      title: 'entityTitle',
    };

    const state = {
      userAbility: {
        can: jest.fn(),
        cannot: jest.fn(() => false),
      },
      user: {
        id: 1,
      },
    };

    const createPermissionsManager = jest.fn(() => ({
      ability: state.userAbility,
    }));

    const permissionChecker = {
      cannot: {
        unpublish: jest.fn(() => false),
      },
      sanitizeOutput: jest.fn((obj) => obj),
      buildReadQuery: jest.fn((query) => query),
    };

    const unpublishFn = jest.fn(() => ({}));

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager,
          },
        },
      },
      getModel() {
        return {
          options: {
            draftAndPublish: true,
          },
          attributes: {
            title: {
              type: 'string',
            },
          },
        };
      },
      plugins: {
        'content-manager': {
          services: {
            'entity-manager': {
              find() {
                return Promise.resolve(entity);
              },
              assocCreatorRoles(enitty) {
                return enitty;
              },
              unpublish: unpublishFn,
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

    const ctx = createContext(
      {
        params: {
          id: entity.id,
          model: modelUid,
        },
      },
      { state }
    );

    await singleTypes.unpublish(ctx);

    expect(unpublishFn).toHaveBeenCalledWith(entity, { updatedBy: state.user.id }, modelUid);
    expect(permissionChecker.cannot.unpublish).toHaveBeenCalledWith(entity);
    expect(permissionChecker.sanitizeOutput).toHaveBeenCalled();
  });
});
