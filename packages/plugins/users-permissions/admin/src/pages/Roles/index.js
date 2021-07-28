import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { CheckPagePermissions, NotFound } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import ProtectedRolesListPage from './ProtectedListPage';
import ProtectedRolesEditPage from './ProtectedEditPage';
import ProtectedRolesCreatePage from './ProtectedCreatePage';

const Roles = () => {
  return (
    <CheckPagePermissions permissions={pluginPermissions.accessRoles}>
      <Switch>
        <Route
          path={`/settings/${pluginId}/roles/new`}
          component={ProtectedRolesCreatePage}
          exact
        />
        <Route path={`/settings/${pluginId}/roles/:id`} component={ProtectedRolesEditPage} exact />
        <Route path={`/settings/${pluginId}/roles`} component={ProtectedRolesListPage} exact />
        <Route path="" component={NotFound} />
      </Switch>
    </CheckPagePermissions>
  );
};

export default Roles;
