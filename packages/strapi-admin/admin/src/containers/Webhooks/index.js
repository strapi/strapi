/**
 *
 * Webhooks
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import WebhooksDataManagerProvider from '../WebhooksDataManagerProvider';

import ListView from './ListView';
import EditView from './EditView';

function Webhooks() {
  return (
    <WebhooksDataManagerProvider>
      <Switch>
        <Route exact path={`/settings/webhooks`}>
          <ListView />
        </Route>
        <Route exact path={`/settings/webhooks/:id`}>
          <EditView />
        </Route>
      </Switch>
    </WebhooksDataManagerProvider>
  );
}

export default Webhooks;
