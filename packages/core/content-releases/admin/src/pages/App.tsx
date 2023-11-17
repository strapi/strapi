import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { ProtectedReleaseDetailsPage } from './ReleaseDetailsPage';
import { ProtectedReleasesPage } from './ReleasesPage';

export const App = () => {
  return (
    <Main>
      <Switch>
        <Route exact path={`/plugins/${pluginId}`} component={ProtectedReleasesPage} />
        <Route
          exact
          path={`/plugins/${pluginId}/:releaseId`}
          component={ProtectedReleaseDetailsPage}
        />
      </Switch>
    </Main>
  );
};
