import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import EditView from '../EditView';

const ProtectedApiTokenCreateView = () => {
  return (
    <CheckPagePermissions permissions={adminPermissions.settings['api-tokens'].read}>
      <EditView />
    </CheckPagePermissions>
  );
};

export default ProtectedApiTokenCreateView;
