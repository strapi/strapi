import * as React from 'react';

import { Page } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { AIGenerationPage } from './pages/AIGenerationPage';
import { AssetsPage } from './pages/Assets/AssetsPage';
import { getTranslationKey } from './utils/translations';

export const UnstableMediaLibrary = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({
    id: getTranslationKey('plugin.name'),
    defaultMessage: 'Media Library',
  });

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>

      <Routes>
        <Route index element={<AssetsPage />} />
        <Route path="ai-generation" element={<AIGenerationPage />} />
      </Routes>
    </Page.Main>
  );
};
