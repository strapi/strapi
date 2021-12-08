import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../permissions';
import EditView from '../EditView';

const ProtectedApiTokenCreateView = () => {
  return (
    <CheckPagePermissions permissions={adminPermissions.settings['api-tokens'].create}>
      <EditView />
    </CheckPagePermissions>
  );
};

export default ProtectedApiTokenCreateView;
