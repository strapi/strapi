import React from 'react';

import { AnErrorOccurred, CheckPagePermissions } from '@strapi/helper-plugin';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';

import { ProtectedRolesCreatePage } from './pages/CreatePage';
import { ProtectedRolesEditPage } from './pages/EditPage';
import { ProtectedRolesListPage } from './pages/ListPage';

const Roles = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.accessRoles}>
      <Routes>
        <Route path="/settings/users-permissions/roles/new" Component={ProtectedRolesCreatePage} />
        <Route path="/settings/users-permissions/roles/:id" Component={ProtectedRolesEditPage} />
        <Route path="/settings/users-permissions/roles" Component={ProtectedRolesListPage} exact />
        <Route path="" Component={AnErrorOccurred} />
      </Routes>
    </CheckPagePermissions>
  );
};

export default Roles;
