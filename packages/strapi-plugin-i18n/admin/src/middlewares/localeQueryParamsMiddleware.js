import get from 'lodash/get';
import getDefaultLocale from '../utils/getDefaultLocale';

const localeQueryParamsMiddleware = () => ({ getState }) => next => action => {
  if (action.type !== 'ContentManager/ListView/SET_LIST_LAYOUT ') {
    return next(action);
  }

  const isFieldLocalized = get(action, 'contentType.pluginOptions.i18n.localized', false);

  if (!isFieldLocalized) {
    return next(action);
  }

  const store = getState();
  const { locales } = store.get('i18n_locales');
  const { collectionTypesRelatedPermissions } = store.get('permissionsManager');
  const ctPermissions = collectionTypesRelatedPermissions[action.contentType.uid];

  const defaultLocale = getDefaultLocale(ctPermissions, locales);

  if (!action.initialParams.plugins) {
    action.initialParams.plugins = {
      i18n: { locale: defaultLocale },
    };

    return next(action);
  }

  if (!get(action, 'initialParams.plugins.i18n.locale')) {
    action.initialParams.plugins.i18n = { locale: defaultLocale };

    return next(action);
  }

  return next(action);
};

export default localeQueryParamsMiddleware;
