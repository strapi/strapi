import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { ProtectedReleasesPage } from './ReleasesPage';

export const Releases = () => {
  return (
    <Main>
      <Switch>
        <Route exact path={`/plugins/${pluginId}`} component={ProtectedReleasesPage} />
        <Route
          path={`/plugins/${pluginId}/:releaseId`}
          render={() => <div>TODO: This is the DetailsPage</div>}
        />
      </Switch>
    </Main>
  );
};
