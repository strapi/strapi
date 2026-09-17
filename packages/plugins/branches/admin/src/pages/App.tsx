import { Page } from '@strapi/admin/strapi-admin';
import { Route, Routes } from 'react-router-dom';

import { ProtectedBranchPage } from './BranchPage';
import { ProtectedBranchesListPage } from './BranchesListPage';

const App = () => (
  <Routes>
    <Route index element={<ProtectedBranchesListPage />} />
    <Route path=":id" element={<ProtectedBranchPage />} />
    <Route path="*" element={<Page.Error />} />
  </Routes>
);

export { App };
