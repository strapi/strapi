import React from 'react';
import { CheckPagePermissions } from 'strapi-helper-plugin';
import adminPermissions from '../../../permissions';
import EditPage from '../EditPage';

const ProtectedEditPage = () => (
  <CheckPagePermissions permissions={adminPermissions.settings.users.update}>
    <EditPage />
  </CheckPagePermissions>
);

export default ProtectedEditPage;
