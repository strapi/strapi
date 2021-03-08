import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { useGlobalContext, NotFound } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import ProtectedRolesListPage from './ProtectedListPage';
import ProtectedRolesEditPage from './ProtectedEditPage';
import ProtectedRolesCreatePage from './ProtectedCreatePage';

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
      <Route
        path={`${settingsBaseURL}/${pluginId}/roles`}
        component={ProtectedRolesListPage}
        exact
      />
      <Route path="" component={NotFound} />
    </Switch>
  );
};

export default Roles;
