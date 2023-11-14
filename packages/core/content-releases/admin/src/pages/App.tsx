import { Main } from '@strapi/design-system';
import { Provider } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import { store } from '../../store/store';
import { pluginId } from '../pluginId';

import { ReleaseDetailsPage } from './ReleaseDetailsPage';
import { ReleasesPage } from './ReleasePage';

export const App = () => {
  return (
    <Provider store={store}>
      <Main>
        <Switch>
          <Route exact path={`/plugins/${pluginId}`} component={ReleasesPage} />
          <Route exact path={`/plugins/${pluginId}/:releaseId`} component={ReleaseDetailsPage} />
        </Switch>
      </Main>
    </Provider>
  );
};
