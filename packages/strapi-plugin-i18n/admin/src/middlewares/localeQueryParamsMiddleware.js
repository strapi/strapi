import React from 'react'
import get from 'lodash/get';

const localeQueryParamsMiddleware = () => () => next => action => {
  if (action.type !== 'ContentManager/ListView/SET_LIST_LAYOUT ') {
    return next(action);
  }

  // Add the locale to the init params for generating a valid query string
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

  // Adds the locale to the listview
  const locale = {
    key: '__locale_key__',
    fieldSchema: { type: 'string' },
    metadatas: { label: 'Content available in', searchable: false, sortable: false },
    name: 'locales',
    cellFormatter: (props) =>  <div>TODO when backend is ready</div>,
  };


  action.displayedHeaders = [...action.displayedHeaders, locale]

  return next(action);
};

export default localeQueryParamsMiddleware;
