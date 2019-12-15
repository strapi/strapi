/**
 *
 * Webhooks
 *
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import WebhooksDataManagerProvider from '../WebhooksDataManagerProvider';

import ListView from './ListView';
import EditView from './EditView';

function Webhooks() {
  const { path } = useRouteMatch();

  return (
    <WebhooksDataManagerProvider>
      <Switch>
        <Route exact path={`${path}`}>
          <ListView />
        </Route>
        <Route path={`${path}/:id`}>
          <EditView />
        </Route>
      </Switch>
    </WebhooksDataManagerProvider>
  );
}

export default Webhooks;
