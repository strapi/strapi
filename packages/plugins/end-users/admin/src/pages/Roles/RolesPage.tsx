import { Page } from '@strapi/admin/strapi-admin';
import { Route, Routes } from 'react-router-dom';

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
    <Page.Protect permissions={PERMISSIONS.roles.read}>
      <Routes>
        <Route index element={<ListPage />} />
        <Route path="new" element={<CreatePage />} />
        <Route path="duplicate/:documentId" element={<CreatePage />} />
        <Route path=":documentId" element={<EditPage />} />
      </Routes>
    </Page.Protect>
  );
};

export { RolesPage };
