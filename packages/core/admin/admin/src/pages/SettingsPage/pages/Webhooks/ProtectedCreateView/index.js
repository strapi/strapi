import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import EditView from '../EditView';

const ProtectedCreateView = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings.webhooks.create}>
      <EditView />
    </CheckPagePermissions>
  );
}

export default ProtectedCreateView;
