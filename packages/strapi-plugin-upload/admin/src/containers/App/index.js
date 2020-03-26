import React from 'react';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { Switch, Route } from 'react-router-dom';
import pluginId from '../../pluginId';
import HomePage from '../HomePage';

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Switch>
        <Route path={`/plugins/${pluginId}`} component={HomePage} />
      </Switch>
    </DndProvider>
  );
};

export default App;
