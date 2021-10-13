import addLocaleToSingleTypesMiddleware from '../addLocaleToSingleTypesMiddleware';

describe('i18n | middlewares | addLocaleToSingleTypesMiddleware', () => {
  let getState;

  beforeEach(() => {
    const store = new Map();
    store.set('i18n_locales', { locales: [] });
    store.set('permissionsManager', { userPermissions: [] });
    store.set('permissionsManager', {
      collectionTypesRelatedPermissions: {
        test: {
          'plugins::content-manager.explorer.read': [],
          'plugins::content-manager.explorer.create': [],
        },
      },
    });

    getState = () => store;
  });

  it('should forward the action when the type is undefined', () => {
    const action = { test: true, type: undefined };

    const next = jest.fn();
    const middleware = addLocaleToSingleTypesMiddleware()({ getState });

    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should forward the action when the type is not StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS', () => {
    const action = { test: true, type: 'TEST' };

    const next = jest.fn();

    const middleware = addLocaleToSingleTypesMiddleware()({ getState });
    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should forward when the authorizedStLinks array is empty', () => {
    const action = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [],
      },
    };
    const middleware = addLocaleToSingleTypesMiddleware()({ getState });

    const next = jest.fn();

    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should not add the search key to a single type link when i18n is not enabled on the single type', () => {
    const action = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [{ destination: 'cm/singleType/test' }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: false } } }],
      },
    };
    const middleware = addLocaleToSingleTypesMiddleware()({ getState });

    const next = jest.fn();

    middleware(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should add a search key with the default locale when the user has the right to read it', () => {
    const tempStore = new Map();
    tempStore.set('i18n_locales', { locales: [{ code: 'en', isDefault: true }] });
    tempStore.set('permissionsManager', { userPermissions: [] });
    tempStore.set('permissionsManager', {
      collectionTypesRelatedPermissions: {
        test: {
          'plugins::content-manager.explorer.read': [{ properties: { locales: ['en'] } }],
          'plugins::content-manager.explorer.create': [],
        },
      },
    });
    const action = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [{ destination: 'cm/singleType/test' }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };
    const middleware = addLocaleToSingleTypesMiddleware()({ getState: () => tempStore });

    const next = jest.fn();

    middleware(next)(action);

    const expected = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [
          { destination: 'cm/singleType/test', search: 'plugins[i18n][locale]=en' },
        ],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };

    expect(next).toBeCalledWith(expected);
  });

  it('should set the isDisplayed key to false when the user does not have the right to read any locale', () => {
    const tempStore = new Map();
    tempStore.set('i18n_locales', { locales: [{ code: 'en', isDefault: true }] });
    tempStore.set('permissionsManager', { userPermissions: [] });
    tempStore.set('permissionsManager', {
      collectionTypesRelatedPermissions: {
        test: {
          'plugins::content-manager.explorer.read': [{ properties: { locales: [] } }],
          'plugins::content-manager.explorer.create': [],
        },
      },
    });
    const action = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [{ destination: 'cm/singleType/test' }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };
    const middleware = addLocaleToSingleTypesMiddleware()({ getState: () => tempStore });

    const next = jest.fn();

    middleware(next)(action);

    const expected = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [{ destination: 'cm/singleType/test', isDisplayed: false }],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };

    expect(next).toBeCalledWith(expected);
  });

  it('should keep the previous search', () => {
    const tempStore = new Map();
    tempStore.set('i18n_locales', { locales: [{ code: 'en', isDefault: true }] });
    tempStore.set('permissionsManager', { userPermissions: [] });
    tempStore.set('permissionsManager', {
      collectionTypesRelatedPermissions: {
        test: {
          'plugins::content-manager.explorer.read': [{ properties: { locales: ['en'] } }],
          'plugins::content-manager.explorer.create': [],
        },
      },
    });
    const action = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [
          { destination: 'cm/singleType/test', search: 'plugins[plugin][test]=test' },
        ],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };
    const middleware = addLocaleToSingleTypesMiddleware()({ getState: () => tempStore });

    const next = jest.fn();

    middleware(next)(action);

    const expected = {
      type: 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS',
      data: {
        authorizedStLinks: [
          {
            destination: 'cm/singleType/test',
            search: 'plugins[plugin][test]=test&plugins[i18n][locale]=en',
          },
        ],
        contentTypeSchemas: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      },
    };

    expect(next).toBeCalledWith(expected);
  });
});
