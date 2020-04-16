import React from 'react';
import { Switch, Route } from 'react-router-dom';
import pluginId from '../../pluginId';
import HomePage from '../HomePage';

const App = () => {
  return (
    <Switch>
      <Route path={`/plugins/${pluginId}`} component={HomePage} />
    </Switch>
  );
};

export default App;
