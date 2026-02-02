import { Page } from '@strapi/admin/strapi-admin';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../constants';

import { ReleaseDetailsPage } from './ReleaseDetailsPage';
import { ReleasesPage } from './ReleasesPage';

export const App = () => {
  return (
    <Page.Protect permissions={PERMISSIONS.main}>
      <Routes>
        <Route index element={<ReleasesPage />} />
        <Route path={':releaseId'} element={<ReleaseDetailsPage />} />
      </Routes>
    </Page.Protect>
  );
};
