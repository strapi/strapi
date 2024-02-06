import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';

import { ProtectedRolesCreatePage } from './pages/CreatePage';
import { ProtectedRolesEditPage } from './pages/EditPage';
import { ProtectedRolesListPage } from './pages/ListPage';

const Roles = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.accessRoles}>
      <Routes>
        <Route index element={<ProtectedRolesListPage />} />
        <Route path="new" element={<ProtectedRolesCreatePage />} />
        <Route path=":id" element={<ProtectedRolesEditPage />} />
      </Routes>
    </CheckPagePermissions>
  );
};

export default Roles;
