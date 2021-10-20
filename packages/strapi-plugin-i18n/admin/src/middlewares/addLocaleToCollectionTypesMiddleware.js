import addLocaleToLinksSearch from './utils/addLocaleToLinksSearch';

const addLocaleToCollectionTypesMiddleware = () => ({ getState }) => next => action => {
  if (action.type !== 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS') {
    return next(action);
  }

  if (action.data.authorizedCtLinks.length) {
    const store = getState();
    const { locales } = store.get('i18n_locales');
    const { collectionTypesRelatedPermissions } = store.get('permissionsManager');

    action.data.authorizedCtLinks = addLocaleToLinksSearch(
      action.data.authorizedCtLinks,
      'collectionType',
      action.data.contentTypeSchemas,
      locales,
      collectionTypesRelatedPermissions
    );
  }

  return next(action);
};

export default addLocaleToCollectionTypesMiddleware;
