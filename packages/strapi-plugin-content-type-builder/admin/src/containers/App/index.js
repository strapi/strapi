/**
 *
 * App
 *
 */

import React, { Suspense, lazy } from 'react';
import { Switch, Route } from 'react-router-dom';
import { LoadingIndicatorPage, WithPagePermissions } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../utils/permissions';
import DataManagerProvider from '../DataManagerProvider';
import RecursivePath from '../RecursivePath';
import icons from './utils/icons.json';
import Wrapper from './Wrapper';

const ListView = lazy(() => import('../ListView'));

const App = () => {
  return (
    <WithPagePermissions permissions={pluginPermissions.main}>
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
    </WithPagePermissions>
  );
};

export default App;
