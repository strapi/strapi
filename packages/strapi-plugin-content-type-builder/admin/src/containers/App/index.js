/**
 *
 * App
 *
 */

import React, { Suspense, lazy } from 'react';
import { Switch, Route } from 'react-router-dom';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import pluginId from '../../pluginId';
import DataManagerProvider from '../DataManagerProvider';
import RecursivePath from '../RecursivePath';
import icons from './utils/icons.json';
import Wrapper from './Wrapper';

const ListView = lazy(() => import('../ListView'));

const App = () => {
  return (
    <CheckPagePermissions permissions={pluginPermissions.main}>
      <Wrapper>
        <DataManagerProvider allIcons={icons}>
          <Suspense fallback={<LoadingIndicatorPage />}>
            <Switch>
              <Route path={`/plugins/${pluginId}/content-types/:uid`} component={ListView} />
              <Route
                path={`/plugins/${pluginId}/component-categories/:categoryUid`}
                component={RecursivePath}
              />
            </Switch>
          </Suspense>
        </DataManagerProvider>
      </Wrapper>
    </CheckPagePermissions>
  );
};

export default App;
