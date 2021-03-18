import localeQueryParamsMiddleware from '../localeQueryParamsMiddleware';

describe('localeQueryParamsMiddleware', () => {
  let getState;

  beforeEach(() => {
    const store = new Map();

    store.set('i18n_locales', { locales: [] });
    store.set('permissionsManager', { userPermissions: [] });
    store.set('permissionsManager', {
      collectionTypesRelatedPermissions: {
        'plugins::content-manager.explorer.read': [],
        'plugins::content-manager.explorer.create': [],
      },
    });

    getState = () => store;
  });

  it('does nothing on unknown actions', () => {
    const middleware = localeQueryParamsMiddleware()({ getState });
    const nextFn = jest.fn();
    const action = { type: 'UNKNOWN' };

    middleware(nextFn)(action);

    expect(nextFn).toBeCalledWith(action);
    expect(action).toEqual({
      type: 'UNKNOWN',
    });
  });

  it('does nothing when there s no i18n.localized key in the action', () => {
    const middleware = localeQueryParamsMiddleware()({ getState });
    const nextFn = jest.fn();
    const action = {
      type: 'ContentManager/ListView/SET_LIST_LAYOUT ',
      contentType: { pluginOptions: {} },

      initialParams: {},
    };

    middleware(nextFn)(action);

    expect(nextFn).toBeCalledWith(action);
    expect(action).toEqual({
      contentType: { pluginOptions: {} },
      initialParams: {},
      type: 'ContentManager/ListView/SET_LIST_LAYOUT ',
    });
  });

  it('creates a plugins key with a locale when initialParams does not have a plugins key and the field is localized', () => {
    const middleware = localeQueryParamsMiddleware()({ getState });
    const nextFn = jest.fn();
    const action = {
      type: 'ContentManager/ListView/SET_LIST_LAYOUT ',
      displayedHeaders: [],
      contentType: {
        pluginOptions: {
          i18n: { localized: true },
        },
      },
      initialParams: {},
    };

    middleware(nextFn)(action);

    expect(nextFn).toBeCalledWith(action);
    // The anonymous function of cellFormatter creates problem, because it's anonymous
    // In our scenario, it's even more tricky because we use a closure in order to pass
    // the locales.
    // Stringifying the action allows us to have a name inside the expectation for the "cellFormatter" key
    expect(JSON.stringify(action)).toBe(
      '{"type":"ContentManager/ListView/SET_LIST_LAYOUT ","displayedHeaders":[{"key":"__locale_key__","fieldSchema":{"type":"string"},"metadatas":{"label":"Content available in","searchable":false,"sortable":false},"name":"locales"}],"contentType":{"pluginOptions":{"i18n":{"localized":true}}},"initialParams":{"plugins":{"i18n":{"locale":null}}}}'
    );
  });

  it('adds a key to plugins with a locale when initialParams has a plugins key and the field is localized', () => {
    const middleware = localeQueryParamsMiddleware()({ getState });
    const nextFn = jest.fn();
    const action = {
      type: 'ContentManager/ListView/SET_LIST_LAYOUT ',
      displayedHeaders: [],
      contentType: {
        pluginOptions: {
          i18n: { localized: true },
        },
      },
      initialParams: {
        plugins: {
          hello: 'world',
        },
      },
    };

    middleware(nextFn)(action);

    expect(nextFn).toBeCalledWith(action);
    expect(JSON.stringify(action)).toBe(
      '{"type":"ContentManager/ListView/SET_LIST_LAYOUT ","displayedHeaders":[{"key":"__locale_key__","fieldSchema":{"type":"string"},"metadatas":{"label":"Content available in","searchable":false,"sortable":false},"name":"locales"}],"contentType":{"pluginOptions":{"i18n":{"localized":true}}},"initialParams":{"plugins":{"hello":"world","i18n":{"locale":null}}}}'
    );
  });
});
