/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { NotFound } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import EditPage from '../EditPage';
import HomePage from '../HomePage';

const App = () => {
  return (
    <div className={pluginId}>
      <Switch>
        <Route
          path={`/plugins/${pluginId}/:settingType/:actionType/:id?`}
          component={EditPage}
          exact
        />
        <Route
          path={`/plugins/${pluginId}/:settingType`}
          component={HomePage}
          exact
        />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
};

export default App;
