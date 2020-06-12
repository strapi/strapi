/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Redirect, Route, useRouteMatch } from 'react-router-dom';
import { CheckPagePermissions, NotFound } from 'strapi-helper-plugin';
import { get, upperFirst, camelCase } from 'lodash';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import getTrad from '../../utils/getTrad';
import EditPage from '../EditPage';
import HomePage from '../HomePage';

const Main = ({ allowedActions }) => {
  const settingType = useRouteMatch(`/plugins/${pluginId}/:settingType`);

  const tabs = ['roles', 'providers', 'email-templates', 'advanced-settings']
    .map(tabName => {
      const name = tabName === 'advanced-settings' ? 'advanced' : tabName;
      const camelCaseName = camelCase(tabName);

      return {
        tabName,
        to: `/plugins/${pluginId}/${name}`,
        name: getTrad(`HeaderNav.link.${camelCaseName}`),
        canAccess: allowedActions[`canRead${upperFirst(camelCaseName)}`],
      };
    })
    .filter(tab => tab.canAccess);

  const firstAllowedSettingEndPoint = get(tabs, '0.to', '');

  // Todo check if the settingType is allowed
  if (!settingType) {
    return <Redirect to={firstAllowedSettingEndPoint} />;
  }

  return (
    <div className={pluginId}>
      <Switch>
        <Route
          path={`/plugins/${pluginId}/:settingType/:actionType/:id?`}
          render={props => (
            <CheckPagePermissions permissions={pluginPermissions.updateRole}>
              <EditPage {...props} />
            </CheckPagePermissions>
          )}
          exact
        />
        <Route
          path={`/plugins/${pluginId}/:settingType`}
          render={props => <HomePage {...props} tabs={tabs} allowedActions={allowedActions} />}
          exact
        />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
};

Main.defaultProps = {
  allowedActions: {
    canMain: false,
    canReadAdvancedSettings: false,
    canReadEmails: false,
    canReadProviders: false,
    canReadRoles: false,
  },
};

export default Main;
