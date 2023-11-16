import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { ReleaseDetailsPage } from './ReleaseDetailsPage';
import { ReleasesPage } from './ReleasesPage';

export const App = () => {
  return (
    <Main>
      <Switch>
        <Route exact path={`/plugins/${pluginId}`} component={ReleasesPage} />
        <Route exact path={`/plugins/${pluginId}/:releaseId`} component={ReleaseDetailsPage} />
      </Switch>
    </Main>
  );
};
