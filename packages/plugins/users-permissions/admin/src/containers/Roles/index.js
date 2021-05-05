import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { NotFound } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

import ProtectedRolesListPage from './ProtectedListPage';
import ProtectedRolesEditPage from './ProtectedEditPage';
import ProtectedRolesCreatePage from './ProtectedCreatePage';

const Roles = () => {
  return (
    <Switch>
      <Route path={`/settings/${pluginId}/roles/new`} component={ProtectedRolesCreatePage} exact />
      <Route path={`/settings/${pluginId}/roles/:id`} component={ProtectedRolesEditPage} exact />
      <Route path={`/settings/${pluginId}/roles`} component={ProtectedRolesListPage} exact />
      <Route path="" component={NotFound} />
    </Switch>
  );
};

export default Roles;
