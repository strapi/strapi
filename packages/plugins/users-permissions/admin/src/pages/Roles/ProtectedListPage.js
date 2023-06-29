import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../constants';

import RolesListPage from './ListPage';

const ProtectedRolesListPage = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.accessRoles}>
      <RolesListPage />
    </CheckPagePermissions>
  );
};

export default ProtectedRolesListPage;
