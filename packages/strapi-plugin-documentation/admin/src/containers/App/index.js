/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { NotFound, WithPagePermissions, useUser } from 'strapi-helper-plugin';
// Utils
import pluginPermissions from '../../permissions';
import pluginId from '../../pluginId';
// Containers
import HomePage from '../HomePage';

function App() {
  const userPermissions = useUser();

  return (
    <WithPagePermissions permissions={pluginPermissions.main}>
      <div className={pluginId}>
        <Switch>
          <Route
            path={`/plugins/${pluginId}`}
            render={props => <HomePage {...props} userPermissions={userPermissions} />}
            exact
          />
          <Route component={NotFound} />
        </Switch>
      </div>
    </WithPagePermissions>
  );
}

export default App;
