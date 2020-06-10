/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { NotFound, WithPagePermissions } from 'strapi-helper-plugin';
// Utils
import pluginPermissions from '../../permissions';
import pluginId from '../../pluginId';
// Containers
import HomePage from '../HomePage';

function App() {
  return (
    <WithPagePermissions permissions={pluginPermissions.main}>
      <div className={pluginId}>
        <Switch>
          <Route path={`/plugins/${pluginId}`} component={HomePage} exact />
          <Route component={NotFound} />
        </Switch>
      </div>
    </WithPagePermissions>
  );
}

export default App;
