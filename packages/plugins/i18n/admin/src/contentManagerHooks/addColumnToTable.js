import React from 'react';

import get from 'lodash/get';

import LocaleListCell from '../components/LocaleListCell/LocaleListCell';

const addColumnToTableHook = ({ displayedHeaders, layout }) => {
  const isFieldLocalized = get(layout, 'contentType.pluginOptions.i18n.localized', false);

  if (!isFieldLocalized) {
    return { displayedHeaders, layout };
  }

  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        key: '__locale_key__',
        fieldSchema: { type: 'string' },
        metadatas: { label: 'Content available in', searchable: false, sortable: false },
        name: 'locales',
        cellFormatter: (props) => <LocaleListCell {...props} />,
      },
    ],
    layout,
  };
};

export default addColumnToTableHook;
