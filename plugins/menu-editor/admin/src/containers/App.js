/* eslint-disable import/no-unresolved */
import { NotFound } from 'strapi-helper-plugin';
import { Switch, Route } from 'react-router-dom';
import React from 'react';
import MenuEditorPlugin from './MenuEditorPlugin';
import pluginId from '../pluginId';

const App = () => {
  return (
    <div>
      <Switch>
        <Route
          path={`/plugins/${pluginId}`}
          component={MenuEditorPlugin}
          exact
        />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
};

export default App;
