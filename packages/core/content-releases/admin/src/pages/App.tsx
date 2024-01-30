import { CheckPagePermissions } from '@strapi/helper-plugin';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../constants';

import { ReleaseDetailsPage } from './ReleaseDetailsPage';
import { ReleasesPage } from './ReleasesPage';

export const App = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.main}>
      <Routes>
        <Route index element={<ReleasesPage />} />
        <Route path={':releaseId'} element={<ReleaseDetailsPage />} />
      </Routes>
    </CheckPagePermissions>
  );
};
