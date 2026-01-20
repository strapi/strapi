import * as React from 'react';

import { Page, useStrapiApp } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { getTrad } from '../utils';

import { AIGenerationPage } from './pages/AIGenerationPage';
import { MediaLibraryPage } from './pages/MediaLibraryPage';

export const UnstableMediaLibraryPage = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>

      <Routes>
        <Route index element={<MediaLibraryPage />} />
        <Route path="ai-generation" element={<AIGenerationPage />} />
      </Routes>
    </Page.Main>
  );
};
