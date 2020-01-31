import { NotFound } from 'strapi-helper-plugin';
import { Switch, Route } from 'react-router-dom';
import MenuEditorPlugin from './MenuEditorPlugin';
import pluginId from '../pluginId';
import React from 'react';

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
