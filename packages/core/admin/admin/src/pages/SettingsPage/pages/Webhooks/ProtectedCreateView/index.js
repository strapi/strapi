import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../App/selectors';
import EditView from '../EditView';

const ProtectedCreateView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings.webhooks.create}>
      <EditView />
    </CheckPagePermissions>
  );
};

export default ProtectedCreateView;
