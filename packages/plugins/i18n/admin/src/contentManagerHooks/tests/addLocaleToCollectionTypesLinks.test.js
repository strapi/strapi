import { fixtures } from '../../../../../../admin-test-utils/lib';
import addLocaleToCollectionTypesLinksHook from '../addLocaleToCollectionTypesLinks';

describe('i18n | contentManagerHooks | addLocaleToCollectionTypesLinksHook', () => {
  let store;

  beforeEach(() => {
    store = {
      ...fixtures.store.state,
      i18n_locales: { locales: [] },
    };
    store.rbacProvider.allPermissions = [];

    store.rbacProvider.collectionTypesRelatedPermissions = {
      test: {
        'plugin::content-manager.explorer.read': [],
        'plugin::content-manager.explorer.create': [],
      },
    };
    store.getState = function() {
      return this;
    };
  });

  it('should return the initialValues when the ctLinks array is empty', () => {
    const data = {
      ctLinks: [],
      models: [],
    };

    const results = addLocaleToCollectionTypesLinksHook(data, store);

    expect(results).toEqual(data);
  });

  it('should not add the search key to a collection type link when i18n is not enabled on the single type', () => {
    const data = {
      ctLinks: [{ to: 'cm/collectionType/test' }],
      models: [{ uid: 'test', pluginOptions: { i18n: { localized: false } } }],
    };

    const results = addLocaleToCollectionTypesLinksHook(data, store);

    expect(results).toEqual(data);
  });

  it('should add a search key with the default locale when the user has the right to read it', () => {
    store.i18n_locales = { locales: [{ code: 'en', isDefault: true }] };
    store.rbacProvider.collectionTypesRelatedPermissions.test[
      'plugin::content-manager.explorer.read'
    ] = [{ properties: { locales: ['en'] } }];

    const data = {
      ctLinks: [{ to: 'cm/collectionType/test', search: null }],
      models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
    };

    const results = addLocaleToCollectionTypesLinksHook(data, store);

    const expected = {
      ctLinks: [{ to: 'cm/collectionType/test', search: 'plugins[i18n][locale]=en' }],
      models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
    };

    expect(results).toEqual(expected);
  });

  it('should set the isDisplayed key to false when the user does not have the right to read any locale', () => {
    store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
    store.rbacProvider.collectionTypesRelatedPermissions.test[
      'plugin::content-manager.explorer.read'
    ] = [{ properties: { locales: [] } }];

    const data = {
      ctLinks: [{ to: 'cm/collectionType/test', search: 'page=1&pageSize=10' }],
      models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
    };

    const results = addLocaleToCollectionTypesLinksHook(data, store);

    const expected = {
      ctLinks: [
        {
          to: 'cm/collectionType/test',
          isDisplayed: false,
          search: 'page=1&pageSize=10',
        },
      ],
      models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
    };

    expect(results).toEqual(expected);
  });

  it('should keep the previous search', () => {
    store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
    store.rbacProvider.collectionTypesRelatedPermissions.test[
      'plugin::content-manager.explorer.read'
    ] = [{ properties: { locales: ['en'] } }];

    const data = {
      ctLinks: [{ to: 'cm/collectionType/test', search: 'plugins[plugin][test]=test' }],
      models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
    };

    const results = addLocaleToCollectionTypesLinksHook(data, store);

    const expected = {
      ctLinks: [
        {
          to: 'cm/collectionType/test',
          search: 'plugins[plugin][test]=test&plugins[i18n][locale]=en',
        },
      ],
      models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
    };

    expect(results).toEqual(expected);
  });
});
