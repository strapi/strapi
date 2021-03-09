import get from 'lodash/get';

const localeQueryParamsMiddleware = () => () => next => action => {
  if (action.type !== 'ContentManager/ListView/SET_LIST_LAYOUT ') {
    return next(action);
  }

  const isFieldLocalized = get(action, 'contentType.pluginOptions.i18n.localized', false);

  if (!isFieldLocalized) {
    return next(action);
  }

  if (!action.initialParams.pluginOptions) {
    action.initialParams.pluginOptions = {
      locale: 'en',
    };

    return next(action);
  }

  if (!action.initialParams.pluginOptions.locale) {
    action.initialParams.pluginOptions.locale = 'en';

    return next(action);
  }

  return next(action);
};

export default localeQueryParamsMiddleware;
