import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import EditView from '../EditView';

const ProtectedApiTokenCreateView = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings['api-tokens'].create}>
      <EditView />
    </CheckPagePermissions>
  );
};

export default ProtectedApiTokenCreateView;
