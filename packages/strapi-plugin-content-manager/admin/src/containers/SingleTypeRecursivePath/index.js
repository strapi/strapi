import React, { Suspense, lazy } from 'react';
import { Switch, Route, useRouteMatch, useParams } from 'react-router-dom';
import { LoadingIndicatorPage, WithPagePermissions } from 'strapi-helper-plugin';
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
            <WithPagePermissions permissions={pluginPermissions.singleTypesConfigurations}>
              <EditSettingsView {...props} {...routeProps} slug={slug} />
            </WithPagePermissions>
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
