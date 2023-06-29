import React from 'react';

import { CheckPagePermissions } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../../../../admin/src/pages/App/selectors';
import ListView from '../ListView';

const ProtectedListPage = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings.auditLogs.main}>
      <ListView />
    </CheckPagePermissions>
  );
};

export default ProtectedListPage;
