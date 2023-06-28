import React from 'react';

import { AnErrorOccurred, CheckPagePermissions } from '@strapi/helper-plugin';
import { Route, Switch } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';
import pluginId from '../../pluginId';

import ProtectedRolesCreatePage from './ProtectedCreatePage';
import ProtectedRolesEditPage from './ProtectedEditPage';
import ProtectedRolesListPage from './ProtectedListPage';

const Roles = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.accessRoles}>
      <Switch>
        <Route
          path={`/settings/${pluginId}/roles/new`}
          component={ProtectedRolesCreatePage}
          exact
        />
        <Route path={`/settings/${pluginId}/roles/:id`} component={ProtectedRolesEditPage} exact />
        <Route path={`/settings/${pluginId}/roles`} component={ProtectedRolesListPage} exact />
        <Route path="" component={AnErrorOccurred} />
      </Switch>
    </CheckPagePermissions>
  );
};

export default Roles;
