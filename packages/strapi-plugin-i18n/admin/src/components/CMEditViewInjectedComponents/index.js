import React from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { useContentManagerEditViewDataManager, useQueryParams } from 'strapi-helper-plugin';
import selectI18NLocales from '../../selectors/selectI18nLocales';
import CMEditViewLocalePicker from '../CMEditViewLocalePicker';

// TODO temp until the API is ready
const localizations = [
  {
    locale: 'en',
    id: 2,
    published_at: 'TODO', // only if d&p is enabled
  },
  {
    locale: 'fr-FR',
    id: 3,
    published_at: null, // only if d&p is enabled
  },
];

const CMEditViewInjectedComponents = () => {
  const { layout } = useContentManagerEditViewDataManager();
  const locales = useSelector(selectI18NLocales);
  const [{ query }, setQuery] = useQueryParams();
  const hasI18nEnabled = get(layout, ['pluginOptions', 'i18n', 'localized'], false);
  const currentLocale = get(query, 'plugins.i18n.locale', false);

  if (!hasI18nEnabled) {
    return null;
  }

  if (!currentLocale) {
    return null;
  }

  return (
    <CMEditViewLocalePicker
      appLocales={locales}
      localizations={localizations}
      query={query}
      setQuery={setQuery}
    />
  );
};

export default CMEditViewInjectedComponents;
