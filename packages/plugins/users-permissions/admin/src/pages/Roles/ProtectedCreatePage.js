import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../../constants';

import RolesCreatePage from './CreatePage';

const ProtectedRolesCreatePage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.createRole}>
    <RolesCreatePage />
  </CheckPagePermissions>
);

export default ProtectedRolesCreatePage;
