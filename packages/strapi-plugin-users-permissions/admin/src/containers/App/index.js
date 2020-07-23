/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { LoadingIndicatorPage, useUserPermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import Main from '../Main';

const App = () => {
  const { isLoading, allowedActions } = useUserPermissions(pluginPermissions);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (allowedActions.canMain) {
    return <Main allowedActions={allowedActions} />;
  }

  return <Redirect to="/" />;
};

export default App;
