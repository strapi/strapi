import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import EditView from '../EditView';

const ProtectedTransferTokenCreateView = () => {
  return (
    <CheckPagePermissions permissions={adminPermissions.settings['transfer-tokens'].read}>
      <EditView />
    </CheckPagePermissions>
  );
};

export default ProtectedTransferTokenCreateView;
