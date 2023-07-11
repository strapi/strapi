import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../App/selectors';
import EditView from '../EditView';

const ProtectedApiTokenCreateView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings['api-tokens'].create}>
      <EditView />
    </CheckPagePermissions>
  );
};

export default ProtectedApiTokenCreateView;
