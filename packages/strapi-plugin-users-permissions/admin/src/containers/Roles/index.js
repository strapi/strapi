import React from 'react';
import { Switch, Route, Link } from 'react-router-dom';
import { useGlobalContext, CheckPagePermissions, NotFound } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';

import ProtectedRolesEditPage from './ProtectedEditPage';
import ProtectedRolesCreatePage from './ProtectedCreatePage';

const RolesListPage = () => {
  return (
    <CheckPagePermissions permissions={pluginPermissions.accessRoles}>
      <div>Role list</div>
      <div>
        <Link to="/settings/users-permissions/roles/1">Edit Role</Link>
      </div>
      <div>
        <Link to="/settings/users-permissions/roles/new">Create Role</Link>
      </div>
    </CheckPagePermissions>
  );
};

const Roles = () => {
  const { settingsBaseURL } = useGlobalContext();

  return (
    <Switch>
      <Route
        path={`${settingsBaseURL}/${pluginId}/roles/new`}
        component={ProtectedRolesCreatePage}
        exact
      />
      <Route
        path={`${settingsBaseURL}/${pluginId}/roles/:id`}
        component={ProtectedRolesEditPage}
        exact
      />
      <Route path={`${settingsBaseURL}/${pluginId}/roles`} component={RolesListPage} exact />
      <Route path="" component={NotFound} />
    </Switch>
  );
};

export default Roles;
