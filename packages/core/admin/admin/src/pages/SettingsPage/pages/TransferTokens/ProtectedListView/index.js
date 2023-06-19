import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import ListView from '../ListView';

const ProtectedTransferTokenListView = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings['transfer-tokens'].main}>
      <ListView />
    </CheckPagePermissions>
  );
}

export default ProtectedTransferTokenListView;
