import React, { memo, useEffect } from 'react';
import { Switch, Route, useRouteMatch, useParams } from 'react-router-dom';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import { ContentTypeLayoutContext } from '../../contexts';
import { useFetchContentTypeLayout } from '../../hooks';
import EditView from '../EditView';
import ListView from '../ListView';
import ListSettingsView from '../ListSettingsView';

const CollectionTypeRecursivePath = () => {
  const { url } = useRouteMatch();
  const { slug } = useParams();
  const { isLoading, layout, updateLayout } = useFetchContentTypeLayout(slug);
  const slugRef = React.useRef(slug);

  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const renderRoute = (routeProps, Component) => {
    // return <Component {...routeProps} slug={slug} layout={layout} />;
    return <Component slug={slugRef.current} layout={layout} />;
  };
  const renderPermissionsRoute = (_, Component) => {
    return (
      <CheckPagePermissions permissions={pluginPermissions.collectionTypesConfigurations}>
        <Component layout={layout} slug={slugRef.current} updateLayout={updateLayout} />
      </CheckPagePermissions>
    );
  };

  const settingsRoutes = [
    {
      path: 'configurations/list',
      comp: ListSettingsView,
    },
    // {
    //   path: 'ctm-configurations/edit-settings/:type',
    //   comp: EditSettingsView,
    // },
  ].map(({ path, comp }) => (
    <Route
      key={path}
      path={`${url}/${path}`}
      render={props => renderPermissionsRoute(props, comp)}
    />
  ));

  const routes = [
    { path: ':id', Comp: EditView },
    { path: '', Comp: ListView },
  ].map(({ path, Comp }) => (
    <Route key={path} path={`${url}/${path}`} render={props => renderRoute(props, Comp)} />
  ));

  return (
    <ContentTypeLayoutContext.Provider value={layout}>
      <Switch>
        {settingsRoutes}
        {routes}
      </Switch>
    </ContentTypeLayoutContext.Provider>
  );
};

export default memo(CollectionTypeRecursivePath);
