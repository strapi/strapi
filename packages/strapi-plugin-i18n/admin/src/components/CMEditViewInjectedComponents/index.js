import React from 'react';
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
  const currentLocale = get(query, 'plugins.i18n.locale', false);

  const hasI18nEnabled = get(layout, ['pluginOptions', 'i18n', 'localized'], false);
  const hasDraftAndPublishEnabled = get(layout, ['options', 'draftAndPublish'], false);

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
      query={query}
      readPermissions={readPermissions}
      slug={slug}
    />
  );
};

export default CMEditViewInjectedComponents;
