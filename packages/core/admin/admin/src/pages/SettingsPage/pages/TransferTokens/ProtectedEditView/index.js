import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import EditView from '../EditView';

const ProtectedTransferTokenCreateView = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings['transfer-tokens'].read}>
      <EditView />
    </CheckPagePermissions>
  );
};

export default ProtectedTransferTokenCreateView;
