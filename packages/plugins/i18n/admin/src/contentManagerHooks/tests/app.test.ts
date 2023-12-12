import { fixtures } from '@strapi/admin-test-utils';

import { addLocaleToLinksHook } from '../app';

import type { RootState } from '../../store/reducers';

describe('app', () => {
  describe('addLocaleToSingleTypesLinks', () => {
    const addLocaleToSingleTypesLinks = addLocaleToLinksHook('single-types');

    let store: Pick<RootState, 'i18n_locales' | 'rbacProvider'> & {
      getState(): Pick<RootState, 'i18n_locales' | 'rbacProvider'>;
    };

    beforeEach(() => {
      // @ts-expect-error – test purpose
      store = {
        ...fixtures.store.state,
        i18n_locales: { locales: [], isLoading: false },
      };
      store.rbacProvider.allPermissions = [];

      store.rbacProvider.collectionTypesRelatedPermissions = {
        test: {
          'plugin::content-manager.explorer.read': [],
          'plugin::content-manager.explorer.create': [],
        },
      };

      store.getState = function () {
        return this;
      };
    });

    it('should forward when the stLinks array is empty', () => {
      const data = {
        stLinks: [],
        models: [],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToSingleTypesLinks(data, store);

      expect(results).toEqual(data);
    });

    it('should not add the search key to a single type link when i18n is not enabled on the single type', () => {
      const data = {
        stLinks: [{ to: 'cm/single-types/test' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: false } } }],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToSingleTypesLinks(data, store);

      expect(results).toEqual(data);
    });

    it('should add a search key with the default locale when the user has the right to read it', () => {
      // @ts-expect-error – test purpose
      store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
      store.rbacProvider.collectionTypesRelatedPermissions.test[
        'plugin::content-manager.explorer.read'
        // @ts-expect-error – test purpose
      ] = [{ properties: { locales: ['en'] } }];

      const data = {
        stLinks: [{ to: 'cm/single-types/test' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToSingleTypesLinks(data, store);

      const expected = {
        stLinks: [{ to: 'cm/single-types/test', search: 'plugins[i18n][locale]=en' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      expect(results).toEqual(expected);
    });

    it('should set the isDisplayed key to false when the user does not have the right to read any locale', () => {
      // @ts-expect-error – test purpose
      store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
      store.rbacProvider.collectionTypesRelatedPermissions.test[
        'plugin::content-manager.explorer.read'
        // @ts-expect-error – test purpose
      ] = [{ properties: { locales: [] } }];

      const data = {
        stLinks: [{ to: 'cm/single-types/test' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };
      // @ts-expect-error – test purpose
      const results = addLocaleToSingleTypesLinks(data, store);

      const expected = {
        stLinks: [{ to: 'cm/single-types/test', isDisplayed: false }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      expect(results).toEqual(expected);
    });

    it('should keep the previous search', () => {
      // @ts-expect-error – test purpose
      store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
      store.rbacProvider.collectionTypesRelatedPermissions.test[
        'plugin::content-manager.explorer.read'
        // @ts-expect-error – test purpose
      ] = [{ properties: { locales: ['en'] } }];

      const data = {
        stLinks: [{ to: 'cm/single-types/test', search: 'plugins[plugin][test]=test' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToSingleTypesLinks(data, store);

      const expected = {
        stLinks: [
          {
            to: 'cm/single-types/test',
            search: 'plugins[plugin][test]=test&plugins[i18n][locale]=en',
          },
        ],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      expect(results).toEqual(expected);
    });
  });

  describe('addLocaleToCollectionTypesLinksHook', () => {
    const addLocaleToCollectionTypesLinksHook = addLocaleToLinksHook('collection-types');

    let store: Pick<RootState, 'i18n_locales' | 'rbacProvider'> & {
      getState(): Pick<RootState, 'i18n_locales' | 'rbacProvider'>;
    };

    beforeEach(() => {
      // @ts-expect-error – test purpose
      store = {
        ...fixtures.store.state,
        i18n_locales: { locales: [], isLoading: false },
      };
      store.rbacProvider.allPermissions = [];

      store.rbacProvider.collectionTypesRelatedPermissions = {
        test: {
          'plugin::content-manager.explorer.read': [],
          'plugin::content-manager.explorer.create': [],
        },
      };

      store.getState = function () {
        return this;
      };
    });

    it('should return the initialValues when the ctLinks array is empty', () => {
      const data = {
        ctLinks: [],
        models: [],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToCollectionTypesLinksHook(data, store);

      expect(results).toEqual(data);
    });

    it('should not add the search key to a collection type link when i18n is not enabled on the single type', () => {
      const data = {
        ctLinks: [{ to: 'cm/collection-types/test' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: false } } }],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToCollectionTypesLinksHook(data, store);

      expect(results).toEqual(data);
    });

    it('should add a search key with the default locale when the user has the right to read it', () => {
      // @ts-expect-error – test purpose
      store.i18n_locales = { locales: [{ code: 'en', isDefault: true }] };
      store.rbacProvider.collectionTypesRelatedPermissions.test[
        'plugin::content-manager.explorer.read'
        // @ts-expect-error – test purpose
      ] = [{ properties: { locales: ['en'] } }];

      const data = {
        ctLinks: [{ to: 'cm/collection-types/test', search: null }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToCollectionTypesLinksHook(data, store);

      const expected = {
        ctLinks: [{ to: 'cm/collection-types/test', search: 'plugins[i18n][locale]=en' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      expect(results).toEqual(expected);
    });

    it('should set the isDisplayed key to false when the user does not have the right to read any locale', () => {
      // @ts-expect-error – test purpose
      store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
      store.rbacProvider.collectionTypesRelatedPermissions.test[
        'plugin::content-manager.explorer.read'
        // @ts-expect-error – test purpose
      ] = [{ properties: { locales: [] } }];

      const data = {
        ctLinks: [{ to: 'cm/collection-types/test', search: 'page=1&pageSize=10' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToCollectionTypesLinksHook(data, store);

      const expected = {
        ctLinks: [
          {
            to: 'cm/collection-types/test',
            isDisplayed: false,
            search: 'page=1&pageSize=10',
          },
        ],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      expect(results).toEqual(expected);
    });

    it('should keep the previous search', () => {
      // @ts-expect-error – test purpose
      store.i18n_locales.locales = [{ code: 'en', isDefault: true }];
      store.rbacProvider.collectionTypesRelatedPermissions.test[
        'plugin::content-manager.explorer.read'
        // @ts-expect-error – test purpose
      ] = [{ properties: { locales: ['en'] } }];

      const data = {
        ctLinks: [{ to: 'cm/collection-types/test', search: 'plugins[plugin][test]=test' }],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      // @ts-expect-error – test purpose
      const results = addLocaleToCollectionTypesLinksHook(data, store);

      const expected = {
        ctLinks: [
          {
            to: 'cm/collection-types/test',
            search: 'plugins[plugin][test]=test&plugins[i18n][locale]=en',
          },
        ],
        models: [{ uid: 'test', pluginOptions: { i18n: { localized: true } } }],
      };

      expect(results).toEqual(expected);
    });
  });
});
