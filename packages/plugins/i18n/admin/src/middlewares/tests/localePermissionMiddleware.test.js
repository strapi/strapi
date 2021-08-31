import localePermissionMiddleware from '../localePermissionMiddleware';

describe('localePermissionMiddleware', () => {
  it('does not modify the action when the type is not "ContentManager/RBACManager/SET_PERMISSIONS"', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'UNKNOWN_TYPE',
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toBe(action);
  });

  it('does not modify the action when it the __meta__ key is not set', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: undefined,
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toBe(action);
  });

  it('does not modify the action when it the __meta__.containerName is not "listView"', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: { containerName: undefined },
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toBe(action);
  });

  it('does not modify the action when it the __meta__.plugins is not set', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: { containerName: 'listView' },
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toBe(action);
  });

  it('does not modify the action when it the __meta__.plugins.i18n.locale is not set', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: {
        containerName: 'listView',
        plugins: {},
      },
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toBe(action);
  });

  it('creates an empty permissions object from an empty array', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: {
        containerName: 'listView',
        plugins: {
          i18n: {
            locale: 'en',
          },
        },
      },
      permissions: {},
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toEqual({
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: { containerName: 'listView', plugins: { i18n: { locale: 'en' } } },
      permissions: {},
    });
  });

  it('creates a valid permissions object from a filled array', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: {
        containerName: 'listView',
        plugins: {
          i18n: {
            locale: 'en',
          },
        },
      },
      permissions: {
        'plugin::content-manager.explorer.create': [
          {
            id: 459,
            action: 'plugin::content-manager.explorer.create',
            subject: 'api::article.article',
            properties: {
              fields: ['Name'],
              locales: ['en'],
            },
            conditions: [],
          },
          {
            id: 459,
            action: 'plugin::content-manager.explorer.create',
            subject: 'api::article.article',
            properties: {
              fields: ['test'],
              locales: ['it'],
            },
            conditions: [],
          },
        ],
      },
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toEqual({
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: { containerName: 'listView', plugins: { i18n: { locale: 'en' } } },
      permissions: {
        'plugin::content-manager.explorer.create': [
          {
            id: 459,
            action: 'plugin::content-manager.explorer.create',
            subject: 'api::article.article',
            properties: {
              fields: ['Name'],
              locales: ['en'],
            },

            conditions: [],
          },
        ],
      },
    });
  });
});
