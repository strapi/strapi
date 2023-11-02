import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { ReleasesPage } from './Releases';

export const Releases = () => {
  return (
    <Main>
      <Switch>
        <Route exact path={`/plugins/${pluginId}`} component={ReleasesPage} />
        <Route
          path={`/plugins/${pluginId}/:releaseId`}
          render={() => <div>TODO: This is the DetailsPage</div>}
        />
      </Switch>
    </Main>
  );
};
