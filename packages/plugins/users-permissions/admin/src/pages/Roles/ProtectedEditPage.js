import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../constants';

import RolesEditPage from './EditPage';

const ProtectedRolesEditPage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.updateRole}>
    <RolesEditPage />
  </CheckPagePermissions>
);

export default ProtectedRolesEditPage;
