import addLocaleToLinksSearch from './utils/addLocaleToLinksSearch';

const addLocaleToSingleTypesLinks = ({ stLinks, models }, store) => {
  if (!stLinks.length) {
    return { stLinks, models };
  }

  const storeState = store.getState();
  const { locales } = storeState.i18n_locales;
  const { collectionTypesRelatedPermissions } = storeState.rbacProvider;

  const mutatedLinks = addLocaleToLinksSearch(
    stLinks,
    'singleType',
    models,
    locales,
    collectionTypesRelatedPermissions
  );

  return { stLinks: mutatedLinks, models };
};

export default addLocaleToSingleTypesLinks;
