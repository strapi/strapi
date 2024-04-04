// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import singleTypes from '../single-types';
import populateBuilder from '../../services/populate-builder';

// Mock the populate functions
jest.mock('../../services/utils/populate', () => ({
  ...jest.requireActual('../../services/utils/populate'),
  getDeepPopulate: () => ({}),
  getQueryPopulate: async () => ({}),
}));

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
      sanitizedQuery: {
        read: (q: any) => q,
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
      getModel: jest.fn(),
      plugins: {
        'content-manager': {
          services: {
            'entity-manager': {
              find() {
                return Promise.resolve();
              },
              assocCreatorRoles(entity: any) {
                return entity;
              },
            },
            'permission-checker': {
              create() {
                return permissionChecker;
              },
            },
            'populate-builder': populateBuilder(),
          },
        },
      },
      entityService: {
        find: jest.fn(),
      },
    } as any;

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
      sanitizeCreateInput: (obj: any) => obj,
      sanitizeOutput: (obj: any) => obj,
      buildReadQuery: jest.fn((query) => query),
      sanitizedQuery: {
        update: (q: any) => q,
      },
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
              assocCreatorRoles(entity: any) {
                return entity;
              },
              create: createFn,
            },
            'permission-checker': {
              create() {
                return permissionChecker;
              },
            },
            'populate-builder': populateBuilder(),
          },
        },
      },
      entityService: {
        find: jest.fn(),
      },
      telemetry: {
        send: sendTelemetry,
      },
    } as any;

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
      sanitizedQuery: {
        delete: (q: any) => q,
      },
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
              assocCreatorRoles(entity: any) {
                return entity;
              },
              delete: deleteFn,
            },
            'permission-checker': {
              create() {
                return permissionChecker;
              },
            },
            'populate-builder': populateBuilder(),
          },
        },
      },
      entityService: {
        find: jest.fn(),
      },
    } as any;

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
      sanitizedQuery: {
        publish: (q: any) => q,
      },
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
              assocCreatorRoles(entity: any) {
                return entity;
              },
              publish: publishFn,
            },
            'permission-checker': {
              create() {
                return permissionChecker;
              },
            },
            'populate-builder': populateBuilder(),
          },
        },
      },
      entityService: {
        find: jest.fn(),
      },
    } as any;

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

    expect(publishFn).toHaveBeenCalledWith(entity, modelUid, { updatedBy: state.user.id });
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
      sanitizedQuery: {
        unpublish: (q: any) => q,
      },
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
              assocCreatorRoles(entity: any) {
                return entity;
              },
              unpublish: unpublishFn,
            },
            'permission-checker': {
              create() {
                return permissionChecker;
              },
            },
            'populate-builder': populateBuilder(),
          },
        },
      },
      entityService: {
        find: jest.fn(),
      },
    } as any;

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

    expect(unpublishFn).toHaveBeenCalledWith(entity, modelUid, { updatedBy: state.user.id });
    expect(permissionChecker.cannot.unpublish).toHaveBeenCalledWith(entity);
    expect(permissionChecker.sanitizeOutput).toHaveBeenCalled();
  });
});
