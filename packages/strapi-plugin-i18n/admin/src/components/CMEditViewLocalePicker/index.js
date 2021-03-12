import React from 'react';
import get from 'lodash/get';
import { useContentManagerEditViewDataManager } from 'strapi-helper-plugin';

const CMEditViewLocalePicker = () => {
  const { layout } = useContentManagerEditViewDataManager();
  const hasI18nEnabled = get(layout, ['pluginOptions', 'i18n', 'localized'], false);

  if (!hasI18nEnabled) {
    return null;
  }

  return <div>coming soon</div>;
};

export default CMEditViewLocalePicker;
