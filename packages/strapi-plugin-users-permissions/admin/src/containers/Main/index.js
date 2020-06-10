/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Redirect, Route, useRouteMatch } from 'react-router-dom';
import { NotFound } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import EditPage from '../EditPage';
import HomePage from '../HomePage';

const Main = () => {
  const settingType = useRouteMatch(`/plugins/${pluginId}/:settingType`);

  // Todo check if the settingType is allowed
  if (!settingType) {
    return <Redirect to={`/plugins/${pluginId}/roles`} />;
  }

  return (
    <div className={pluginId}>
      <Switch>
        <Route
          path={`/plugins/${pluginId}/:settingType/:actionType/:id?`}
          component={EditPage}
          exact
        />
        <Route path={`/plugins/${pluginId}/:settingType`} component={HomePage} exact />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
};

export default Main;
