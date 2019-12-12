/**
 *
 * Webhooks
 *
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import ListView from './ListView';
import EditView from './EditView';

function Webhooks() {
  let { path } = useRouteMatch();

  return (
    <Switch>
      <Route exact path={`${path}`}>
        <ListView />
      </Route>
      <Route path={`${path}/:id`}>
        Edit <EditView />
      </Route>
    </Switch>
  );
}

export default Webhooks;
