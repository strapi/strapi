import React from 'react';
import { Switch, Route } from 'react-router-dom';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useUserPermissions,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import { AppContext } from '../../contexts';

import HomePage from '../HomePage';

const App = () => {
  const state = useUserPermissions(pluginPermissions);

  // Show a loader while all permissions are being checked
  if (state.isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <CheckPagePermissions permissions={pluginPermissions.main}>
      <AppContext.Provider value={state}>
        <Switch>
          <Route path={`/plugins/${pluginId}`} component={HomePage} />
        </Switch>
      </AppContext.Provider>
    </CheckPagePermissions>
  );
};

export default App;
