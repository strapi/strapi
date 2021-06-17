import addLocaleToLinksSearch from './utils/addLocaleToLinksSearch';

const addLocaleToSingleTypesMiddleware = () => ({ getState }) => next => action => {
  if (action.type !== 'ContentManager/App/SET_CONTENT_TYPE_LINKS') {
    return next(action);
  }

  if (action.data.authorizedStLinks.length) {
    const store = getState();
    const { locales } = store.i18n_locales;
    const { collectionTypesRelatedPermissions } = store.rbacProvider;

    action.data.authorizedStLinks = addLocaleToLinksSearch(
      action.data.authorizedStLinks,
      'singleType',
      action.data.contentTypeSchemas,
      locales,
      collectionTypesRelatedPermissions
    );
  }

  return next(action);
};

export default addLocaleToSingleTypesMiddleware;
