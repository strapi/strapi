import { CheckPagePermissions } from '@strapi/helper-plugin';
import { Route, Switch } from 'react-router-dom';

import { PERMISSIONS } from '../constants';
import { pluginId } from '../pluginId';

import { ReleaseDetailsPage } from './ReleaseDetailsPage';
import { ReleasesPage } from './ReleasesPage';

export const App = () => {
  return (
    <CheckPagePermissions permissions={PERMISSIONS.main}>
      <Switch>
        <Route exact path={`/plugins/${pluginId}`} component={ReleasesPage} />
        <Route exact path={`/plugins/${pluginId}/:releaseId`} component={ReleaseDetailsPage} />
      </Switch>
    </CheckPagePermissions>
  );
};
