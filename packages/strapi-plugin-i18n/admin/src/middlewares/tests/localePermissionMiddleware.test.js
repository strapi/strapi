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

  it('does not modify the action when it the __meta__.pluginOptions is not set', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: { containerName: 'listView' },
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toBe(action);
  });

  it('does not modify the action when it the __meta__.pluginOptions.locale is not set', () => {
    const nextFn = jest.fn(x => x);
    const action = {
      type: 'ContentManager/RBACManager/SET_PERMISSIONS',
      __meta__: {
        containerName: 'listView',
        pluginOptions: {},
      },
    };

    const nextAction = localePermissionMiddleware()()(nextFn)(action);

    expect(nextAction).toBe(action);
  });
});
