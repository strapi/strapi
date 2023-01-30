import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../../../../../admin/src/permissions';
import ListView from '../ListView';

const ProtectedListPage = () => (
  <CheckPagePermissions permissions={adminPermissions.settings.auditLogs.main}>
    <ListView />
  </CheckPagePermissions>
);

export default ProtectedListPage;
