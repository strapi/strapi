import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import ListView from '../ListView';

const ProtectedApiTokenListView = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings['api-tokens'].main}>
      <ListView />
    </CheckPagePermissions>
  );
}

export default ProtectedApiTokenListView;
