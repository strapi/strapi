import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import EditView from '../EditView';

const ProtectedEditView = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings.webhooks.update}>
      <EditView />
    </CheckPagePermissions>
  );
}

export default ProtectedEditView;
