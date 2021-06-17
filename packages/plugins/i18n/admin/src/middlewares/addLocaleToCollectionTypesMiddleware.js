import addLocaleToLinksSearch from './utils/addLocaleToLinksSearch';

const addLocaleToCollectionTypesMiddleware = () => ({ getState }) => next => action => {
  if (action.type !== 'ContentManager/App/SET_CONTENT_TYPE_LINKS') {
    return next(action);
  }

  if (action.data.authorizedCtLinks.length) {
    const store = getState();
    const { locales } = store.i18n_locales;
    const { collectionTypesRelatedPermissions } = store.rbacProvider;

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
