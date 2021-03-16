import get from 'lodash/get';

const localeQueryParamsMiddleware = () => () => next => action => {
  if (action.type !== 'ContentManager/ListView/SET_LIST_LAYOUT ') {
    return next(action);
  }

  const isFieldLocalized = get(action, 'contentType.pluginOptions.i18n.localized', false);

  if (!isFieldLocalized) {
    return next(action);
  }

  if (!action.initialParams.plugins) {
    action.initialParams.plugins = {
      i18n: { locale: 'en' },
    };

    return next(action);
  }

  if (!get(action, 'initialParams.plugins.i18n.locale')) {
    action.initialParams.plugins.i18n = { locale: 'en' };

    return next(action);
  }

  return next(action);
};

export default localeQueryParamsMiddleware;
