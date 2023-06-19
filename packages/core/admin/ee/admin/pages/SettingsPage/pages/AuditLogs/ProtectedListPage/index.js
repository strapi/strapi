import React from 'react';

import { CheckPagePermissions, useAppInfo } from '@strapi/helper-plugin';

import ListView from '../ListView';

const ProtectedListPage = () => {
  const { permissions } = useAppInfo();

  return (
    <CheckPagePermissions permissions={permissions.settings.auditLogs.main}>
      <ListView />
    </CheckPagePermissions>
  );
}

export default ProtectedListPage;
