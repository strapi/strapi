import React from 'react';
import { CheckPagePermissions } from 'strapi-helper-plugin';
import adminPermissions from '../../../permissions';
import EditPage from '../EditPage';

const ProtectedListPage = () => (
  <CheckPagePermissions permissions={adminPermissions.settings.roles.update}>
    <EditPage />
  </CheckPagePermissions>
);

export default ProtectedListPage;
