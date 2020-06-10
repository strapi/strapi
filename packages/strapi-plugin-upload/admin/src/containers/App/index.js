import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { WithPagePermissions } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import HomePage from '../HomePage';

const App = () => {
  return (
    <WithPagePermissions permissions={pluginPermissions.main}>
      <Switch>
        <Route path={`/plugins/${pluginId}`} component={HomePage} />
      </Switch>
    </WithPagePermissions>
  );
};

export default App;
