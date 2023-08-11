import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../../constants';
import { CreatePage } from '../pages/CreatePage';

export const ProtectedRolesCreatePage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.createRole}>
    <CreatePage />
  </CheckPagePermissions>
);
