import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import pluginPermissions from '../../../permissions';
import RolesCreatePage from '../CreatePage';

const ProtectedRolesCreatePage = () => (
  <CheckPagePermissions permissions={pluginPermissions.createRole}>
    <RolesCreatePage />
  </CheckPagePermissions>
);

export default ProtectedRolesCreatePage;
