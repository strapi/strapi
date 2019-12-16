/**
 *
 * Webhooks
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';

import ListView from './ListView';
import EditView from './EditView';

function Webhooks() {
  return (
    <Switch>
      <Route exact path={`/settings/webhooks`}>
        <ListView />
      </Route>
      <Route exact path={`/settings/webhooks/:id`}>
        <EditView />
      </Route>
    </Switch>
  );
}

export default Webhooks;
