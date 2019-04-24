/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
// Utils
import pluginId from '../../pluginId';
// Containers
import HomePage from '../HomePage';
import { NotFound } from 'strapi-helper-plugin';

function App() {
  return (
    <div className={pluginId}>
      <Switch>
        <Route path={`/plugins/${pluginId}`} component={HomePage} exact />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default App;
