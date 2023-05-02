import { fixtures } from '@strapi/admin-test-utils';
import selectCollectionTypePermissions from '../selectCollectionTypesRelatedPermissions';
import selectI18NLocales from '../selectI18nLocales';

describe('i18n | selectors | selectCollectionTypePermissions', () => {
  let store;

  beforeEach(() => {
    store = { ...fixtures.store.state };
  });

  it('resolves the permissions key of the "rbacProvider.collectionTypesRelatedPermissions" store key', () => {
    const actual = selectCollectionTypePermissions(store);

    expect(actual).toBeDefined();
  });
});

describe('i18n | selectors | selectI18NLocales', () => {
  let store;

  beforeEach(() => {
    store = { ...fixtures.store.state, i18n_locales: { isLoading: true, locales: [] } };
  });

  it('resolves the permissions key of the "i18n_locales" store key', () => {
    const actual = selectI18NLocales(store);

    expect(actual).toBeDefined();
  });
});
