import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { LoadingIndicatorPage, useUserPermissions } from 'strapi-helper-plugin';
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

  if (state.allowedActions.canMain) {
    return (
      <AppContext.Provider value={state}>
        <Switch>
          <Route path={`/plugins/${pluginId}`} component={HomePage} />
        </Switch>
      </AppContext.Provider>
    );
  }

  return <Redirect to="/" />;
};

export default App;
