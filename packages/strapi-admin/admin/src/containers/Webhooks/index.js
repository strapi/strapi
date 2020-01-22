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
      <Route exact path="/settings/webhooks" component={ListView} />
      <Route exact path="/settings/webhooks/:id" component={EditView} />
    </Switch>
  );
}

export default Webhooks;
