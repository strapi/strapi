import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../../constants';
import RolesListPage from '../pages/ListPage';

export const ProtectedRolesListPage = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.accessRoles}>
      <RolesListPage />
    </CheckPagePermissions>
  );
};
