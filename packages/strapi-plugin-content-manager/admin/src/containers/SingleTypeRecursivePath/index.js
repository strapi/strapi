import React, { Suspense, lazy } from 'react';
import { Switch, Route, useRouteMatch, useParams } from 'react-router-dom';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';

const EditView = lazy(() => import('../EditView'));
const EditSettingsView = lazy(() => import('../EditSettingsView'));

const SingleTypeRecursivePath = props => {
  const { url } = useRouteMatch();
  const { slug } = useParams();

  const renderRoute = (routeProps, Component) => {
    return <Component {...props} {...routeProps} slug={slug} />;
  };

  const routes = [
    {
      path: 'ctm-configurations/edit-settings/:type',
      comp: EditSettingsView,
    },
    { path: '', comp: EditView },
  ].map(({ path, comp }) => (
    <Route
      key={path}
      path={`${url}/${path}`}
      render={props => renderRoute(props, comp)}
    />
  ));

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <Switch>{routes}</Switch>
    </Suspense>
  );
};

export default SingleTypeRecursivePath;
