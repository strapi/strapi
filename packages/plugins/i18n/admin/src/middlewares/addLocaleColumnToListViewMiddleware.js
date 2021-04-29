import React from 'react';
import get from 'lodash/get';
import LocaleListCell from '../components/LocaleListCell/LocaleListCell';

const addLocaleColumnToListViewMiddleware = () => ({ getState }) => next => action => {
  if (action.type !== 'ContentManager/ListView/SET_LIST_LAYOUT ') {
    return next(action);
  }

  const isFieldLocalized = get(action, 'contentType.pluginOptions.i18n.localized', false);

  if (!isFieldLocalized) {
    return next(action);
  }

  const store = getState();
  const { locales } = store.get('i18n_locales');

  const locale = {
    key: '__locale_key__',
    fieldSchema: { type: 'string' },
    metadatas: { label: 'Content available in', searchable: false, sortable: false },
    name: 'locales',
    cellFormatter: props => <LocaleListCell {...props} locales={locales} />,
  };

  action.displayedHeaders = [...action.displayedHeaders, locale];

  return next(action);
};

export default addLocaleColumnToListViewMiddleware;
