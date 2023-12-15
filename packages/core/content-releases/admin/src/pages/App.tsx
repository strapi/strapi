import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { ProtectedReleaseDetailsPage } from './ReleaseDetailsPage';
import { ProtectedReleasesPage } from './ReleasesPage';

export const App = () => {
  return (
    <Switch>
      <Route exact path={`/plugins/${pluginId}`} component={ProtectedReleasesPage} />
      <Route
        exact
        path={`/plugins/${pluginId}/:releaseId`}
        component={ProtectedReleaseDetailsPage}
      />
    </Switch>
  );
};
