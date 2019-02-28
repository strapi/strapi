/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';

import pluginId from '../../pluginId';

// Containers
import ConfigPage from '../ConfigPage';

function App() {
  return (
    <div className={pluginId}>
      <Switch>
        <Route path={`/plugins/${pluginId}/configurations/:env`} component={ConfigPage} exact />
        <Route path={`/plugins/${pluginId}/configurations/`} component={ConfigPage} exact />
        <Route path={`/plugins/${pluginId}`} component={ConfigPage} exact />
      </Switch>
    </div>
  );
}

export default App;
