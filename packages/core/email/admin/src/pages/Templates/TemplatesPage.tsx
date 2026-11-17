import { Page } from '@strapi/admin/strapi-admin';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';

import { EditPage } from './EditPage';
import { ListPage } from './ListPage';

export const ProtectedTemplatesPage = () => (
  <Page.Protect permissions={PERMISSIONS.templatesRead}>
    <TemplatesPage />
  </Page.Protect>
);

const TemplatesPage = () => (
  <Routes>
    <Route index element={<ListPage />} />
    <Route path=":key" element={<EditPage />} />
  </Routes>
);
