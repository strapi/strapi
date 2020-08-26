import React, { Suspense, lazy } from 'react';
import { Switch, Route, useRouteMatch, useParams } from 'react-router-dom';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';

const EditView = lazy(() => import('../EditView'));
const EditSettingsView = lazy(() => import('../EditSettingsView'));

const SingleTypeRecursivePath = props => {
  const { url } = useRouteMatch();
  const { slug } = useParams();

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <Switch>
        <Route
          path={`${url}/ctm-configurations/edit-settings/:type`}
          render={routeProps => (
            <CheckPagePermissions permissions={pluginPermissions.singleTypesConfigurations}>
              <EditSettingsView {...props} {...routeProps} slug={slug} />
            </CheckPagePermissions>
          )}
        />
        <Route
          path={`${url}`}
          render={routeProps => <EditView {...props} {...routeProps} slug={slug} />}
        />
      </Switch>
    </Suspense>
  );
};

export default SingleTypeRecursivePath;
