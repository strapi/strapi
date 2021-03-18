import React, { useMemo } from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useContentManagerEditViewDataManager, useQueryParams } from 'strapi-helper-plugin';
import selectI18NLocales from '../../selectors/selectI18nLocales';
import CMEditViewLocalePicker from '../CMEditViewLocalePicker';
import selectCollectionTypesRelatedPermissions from './selectors';

const CMEditViewInjectedComponents = () => {
  const { layout, modifiedData, slug } = useContentManagerEditViewDataManager();
  const colllectionTypesRelatedPermissions = useSelector(selectCollectionTypesRelatedPermissions);
  const locales = useSelector(selectI18NLocales);
  const params = useParams();
  const [{ query }] = useQueryParams();

  const id = get(params, 'id', null);
  const currentEntityId = id === 'create' ? null : id;
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

  const currentCTRelatedPermissions = colllectionTypesRelatedPermissions[slug];
  const readPermissions = currentCTRelatedPermissions['plugins::content-manager.explorer.read'];
  const createPermissions = currentCTRelatedPermissions['plugins::content-manager.explorer.create'];

  const localizations = get(modifiedData, 'localizations', []);

  return (
    <CMEditViewLocalePicker
      appLocales={locales}
      currentEntityId={currentEntityId}
      createPermissions={createPermissions}
      hasDraftAndPublishEnabled={hasDraftAndPublishEnabled}
      localizations={localizations}
      query={defaultQuery}
      readPermissions={readPermissions}
      slug={slug}
    />
  );
};

export default CMEditViewInjectedComponents;
