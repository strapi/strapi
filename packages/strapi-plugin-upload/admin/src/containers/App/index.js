import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { CheckPagePermissions } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import useUserPermissions from '../../hooks/useUserPermissions';
import HomePage from '../HomePage';

const App = () => {
  const state = useUserPermissions(Object.keys(pluginPermissions));
  console.log(state);

  return (
    <CheckPagePermissions permissions={pluginPermissions.main}>
      <Switch>
        <Route path={`/plugins/${pluginId}`} component={HomePage} />
      </Switch>
    </CheckPagePermissions>
  );
};

export default App;
