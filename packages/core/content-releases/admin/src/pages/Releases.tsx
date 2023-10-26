import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

export const Releases = () => {
  return (
    <Main>
      <Switch>
        <Route
          exact
          path={`/plugins/${pluginId}`}
          render={() => <div>TODO: This is the ListPage</div>}
        />
        <Route
          path={`/plugins/${pluginId}/:releaseId`}
          render={() => <div>TODO: This is the DetailsPage</div>}
        />
      </Switch>
    </Main>
  );
};
