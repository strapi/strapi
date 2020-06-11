import React, { Suspense, lazy } from 'react';
import { Switch, Route, useRouteMatch, useParams } from 'react-router-dom';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';

const EditView = lazy(() => import('../EditView'));
const EditSettingsView = lazy(() => import('../EditSettingsView'));
const ListView = lazy(() => import('../ListView'));
const ListSettingsView = lazy(() => import('../ListSettingsView'));

const CollectionTypeRecursivePath = props => {
  const { url } = useRouteMatch();
  const { slug } = useParams();

  const renderRoute = (routeProps, Component) => {
    return <Component {...props} {...routeProps} slug={slug} />;
  };
  const renderPermissionsRoute = (routeProps, Component) => {
    return (
      <CheckPagePermissions permissions={pluginPermissions.collectionTypesConfigurations}>
        <Component {...props} {...routeProps} slug={slug} />
      </CheckPagePermissions>
    );
  };

  const settingsRoutes = [
    {
      path: 'ctm-configurations/list-settings',
      comp: ListSettingsView,
    },
    {
      path: 'ctm-configurations/edit-settings/:type',
      comp: EditSettingsView,
    },
  ].map(({ path, comp }) => (
    <Route
      key={path}
      path={`${url}/${path}`}
      render={props => renderPermissionsRoute(props, comp)}
    />
  ));

  const routes = [
    { path: ':id', comp: EditView },
    { path: '', comp: ListView },
  ].map(({ path, comp }) => (
    <Route key={path} path={`${url}/${path}`} render={props => renderRoute(props, comp)} />
  ));

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <Switch>
        {settingsRoutes}
        {routes}
      </Switch>
    </Suspense>
  );
};

export default CollectionTypeRecursivePath;
