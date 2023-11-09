import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { ReleaseDetailsPage } from './ReleaseDetailsPage/Release';
import { ReleasesPage } from './ReleasesPage/Releases';

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
