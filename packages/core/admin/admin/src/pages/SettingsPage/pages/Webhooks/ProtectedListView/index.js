import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import ListView from '../ListView';

const ProtectedListView = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings.webhooks.main}>
      <ListView />
    </CheckPagePermissions>
  );
}

export default ProtectedListView;
