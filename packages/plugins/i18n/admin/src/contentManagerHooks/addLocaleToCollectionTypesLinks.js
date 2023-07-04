import addLocaleToLinksSearch from './utils/addLocaleToLinksSearch';

const addLocaleToCollectionTypesLinksHook = ({ ctLinks, models }, store) => {
  if (!ctLinks.length) {
    return { ctLinks, models };
  }

  const storeState = store.getState();
  const { locales, preferredLocale } = storeState.i18n_locales;
  const { collectionTypesRelatedPermissions } = storeState.rbacProvider;

  const mutatedLinks = addLocaleToLinksSearch(
    ctLinks,
    'collectionType',
    models,
    preferredLocale,
    locales,
    collectionTypesRelatedPermissions
  );

  return { ctLinks: mutatedLinks, models };
};

export default addLocaleToCollectionTypesLinksHook;
