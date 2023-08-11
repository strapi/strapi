import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../../constants';
import { EditPage } from '../pages/EditPage';

export const ProtectedRolesEditPage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.updateRole}>
    <EditPage />
  </CheckPagePermissions>
);
