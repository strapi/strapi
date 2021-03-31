import React, { useMemo } from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useContentManagerEditViewDataManager, useQueryParams } from 'strapi-helper-plugin';
import selectI18NLocales from '../../selectors/selectI18nLocales';
import useContentTypePermissions from '../../hooks/useContentTypePermissions';
import CMEditViewLocalePicker from '../CMEditViewLocalePicker';

const CMEditViewInjectedComponents = () => {
  const { layout, modifiedData, slug, isSingleType } = useContentManagerEditViewDataManager();
  const { createPermissions, readPermissions } = useContentTypePermissions(slug);
  const locales = useSelector(selectI18NLocales);
  const params = useParams();
  const [{ query }, setQuery] = useQueryParams();

  const id = get(params, 'id', null);
  const currentEntityId = id;
  const defaultLocale = locales.find(loc => loc.isDefault);
  const currentLocale = get(query, 'plugins.i18n.locale', defaultLocale.code);
  const hasI18nEnabled = get(layout, ['pluginOptions', 'i18n', 'localized'], false);
  const hasDraftAndPublishEnabled = get(layout, ['options', 'draftAndPublish'], false);

  const defaultQuery = useMemo(() => {
    if (!query) {
      return { plugins: { i18n: { locale: currentLocale } } };
    }

    return query;
  }, [query, currentLocale]);

  if (!hasI18nEnabled) {
    return null;
  }

  if (!currentLocale) {
    return null;
  }

  const localizations = get(modifiedData, 'localizations', []);

  return (
    <CMEditViewLocalePicker
      appLocales={locales}
      currentEntityId={currentEntityId}
      createPermissions={createPermissions}
      hasDraftAndPublishEnabled={hasDraftAndPublishEnabled}
      localizations={localizations}
      isSingleType={isSingleType}
      query={defaultQuery}
      readPermissions={readPermissions}
      setQuery={setQuery}
      slug={slug}
    />
  );
};

export default CMEditViewInjectedComponents;
