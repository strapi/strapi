// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { Page } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { getTrad } from '../../utils';

const UnstableMediaLibrary = () => {
  return (
    <div>
      <div>TODO: Unstable Media Library</div>
    </div>
  );
};

export const UnstableMediaLibraryPage = () => {
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>

      <Routes>
        <Route index element={<UnstableMediaLibrary />} />
      </Routes>
    </Page.Main>
  );
};
