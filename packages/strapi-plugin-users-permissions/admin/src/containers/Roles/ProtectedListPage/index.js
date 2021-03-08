import React from 'react';
import { CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../../permissions';

import RolesListPage from '../ListPage';

const ProtectedRolesListPage = () => {
  return (
    <CheckPagePermissions permissions={pluginPermissions.accessRoles}>
      <RolesListPage />
    </CheckPagePermissions>
  );
};

export default ProtectedRolesListPage;
