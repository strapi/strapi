import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../constants';

import { EditPage } from './EditPage';

const ProtectedRolesEditPage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.updateRole}>
    <EditPage />
  </CheckPagePermissions>
);

export default ProtectedRolesEditPage;
