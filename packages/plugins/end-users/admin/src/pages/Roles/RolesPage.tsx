import { Page } from '@strapi/admin/strapi-admin';
import { Route, Routes } from 'react-router-dom';

import { CheckModeNotice } from '../../components/CheckModeNotice';
import { MigrationBanner } from '../../components/MigrationBanner';
import { PERMISSIONS } from '../../constants';

import { CreatePage } from './CreatePage';
import { EditPage } from './EditPage';
import { ListPage } from './ListPage';

/**
 * Everything under `/settings/end-users/roles`: the list, and the pages that create, duplicate and
 * edit a role.
 */
const RolesPage = () => {
  return (
    <CheckModeNotice page="roles">
      <Page.Protect permissions={PERMISSIONS.roles.read}>
        <MigrationBanner />
        <Routes>
          <Route index element={<ListPage />} />
          <Route path="new" element={<CreatePage />} />
          <Route path="duplicate/:documentId" element={<CreatePage />} />
          <Route path=":documentId" element={<EditPage />} />
        </Routes>
      </Page.Protect>
    </CheckModeNotice>
  );
};

export { RolesPage };
