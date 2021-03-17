import React from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useContentManagerEditViewDataManager, useQueryParams } from 'strapi-helper-plugin';
import selectI18NLocales from '../../selectors/selectI18nLocales';
import CMEditViewLocalePicker from '../CMEditViewLocalePicker';

const CMEditViewInjectedComponents = () => {
  const { layout, modifiedData, slug } = useContentManagerEditViewDataManager();
  const locales = useSelector(selectI18NLocales);
  const params = useParams();
  const id = get(params, 'id', null);
  const currentEntityId = id === 'create' ? null : id;
  const [{ query }] = useQueryParams();
  const hasI18nEnabled = get(layout, ['pluginOptions', 'i18n', 'localized'], false);

  const hasDraftAndPublishEnabled = get(layout, ['options', 'draftAndPublish'], false);
  const currentLocale = get(query, 'plugins.i18n.locale', false);
  const localizations = get(modifiedData, 'localizations', []);

  if (!hasI18nEnabled) {
    return null;
  }

  if (!currentLocale) {
    return null;
  }

  return (
    <CMEditViewLocalePicker
      appLocales={locales}
      hasDraftAndPublishEnabled={hasDraftAndPublishEnabled}
      localizations={localizations}
      query={query}
      currentEntityId={currentEntityId}
      slug={slug}
    />
  );
};

export default CMEditViewInjectedComponents;
