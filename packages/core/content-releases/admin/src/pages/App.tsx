import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { ReleasePage } from './DetailsPage/Release';
import { ReleasesPage } from './ReleasesPage/Releases';

export const App = () => {
  return (
    <Main>
      <Switch>
        <Route exact path={`/plugins/${pluginId}`} component={ReleasesPage} />
        <Route exact path={`/plugins/${pluginId}/:releaseId`} component={ReleasePage} />
      </Switch>
    </Main>
  );
};
