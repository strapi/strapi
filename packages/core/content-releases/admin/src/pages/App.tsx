import { Main } from '@strapi/design-system';
import { Route, Switch } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { Release } from './DetailsPage/Release';

export const Releases = () => {
  return (
    <Main>
      <Switch>
        <Route
          exact
          path={`/plugins/${pluginId}`}
          component={() => <div>TODO: This is the ListPage</div>}
        />
        <Route exact path={`/plugins/${pluginId}/:releaseId`} component={Release} />
      </Switch>
    </Main>
  );
};
