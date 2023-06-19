import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import ListPage from '../ListPage';

const ProtectedListPage = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings.roles.main}>
      <ListPage />
    </CheckPagePermissions>
  );
}

export default ProtectedListPage;
