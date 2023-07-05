import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../App/selectors';
import ListView from '../ListView';

const ProtectedListView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings.webhooks.main}>
      <ListView />
    </CheckPagePermissions>
  );
};

export default ProtectedListView;
