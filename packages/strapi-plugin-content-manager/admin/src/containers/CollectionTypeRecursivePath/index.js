import React, { memo, useEffect, useMemo } from 'react';
import { Switch, Route, useRouteMatch, useParams } from 'react-router-dom';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import { ContentTypeLayoutContext } from '../../contexts';
import { useFetchContentTypeLayout } from '../../hooks';
import { formatLayoutToApi } from '../../utils';
import EditView from '../EditView';
import EditSettingsView from '../EditSettingsView';
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

  const { rawContentTypeLayout, rawComponentsLayouts } = useMemo(() => {
    let rawContentTypeLayout = {};
    let rawComponentsLayouts = {};

    if (layout.contentType) {
      rawContentTypeLayout = formatLayoutToApi(layout.contentType);
    }

    if (layout.components) {
      rawComponentsLayouts = Object.keys(layout.components).reduce((acc, current) => {
        acc[current] = formatLayoutToApi(layout.components[current]);

        return acc;
      }, {});
    }

    return { rawContentTypeLayout, rawComponentsLayouts };
  }, [layout]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const renderRoute = (_, Component) => {
    return <Component slug={slugRef.current} layout={layout} />;
  };

  const routes = [
    { path: ':id', Comp: EditView },
    { path: '', Comp: ListView },
  ].map(({ path, Comp }) => (
    <Route key={path} path={`${url}/${path}`} render={props => renderRoute(props, Comp)} />
  ));

  return (
    <ContentTypeLayoutContext.Provider value={layout}>
      <Switch>
        <Route path={`${url}/configurations/list`}>
          <CheckPagePermissions permissions={pluginPermissions.collectionTypesConfigurations}>
            <ListSettingsView
              layout={rawContentTypeLayout}
              slug={slugRef.current}
              updateLayout={updateLayout}
            />
          </CheckPagePermissions>
        </Route>
        <Route path={`${url}/configurations/edit`}>
          <CheckPagePermissions permissions={pluginPermissions.collectionTypesConfigurations}>
            <EditSettingsView
              components={rawComponentsLayouts}
              isContentTypeView
              mainLayout={rawContentTypeLayout}
              slug={slugRef.current}
              updateLayout={updateLayout}
            />
          </CheckPagePermissions>
        </Route>
        {routes}
      </Switch>
    </ContentTypeLayoutContext.Provider>
  );
};

export default memo(CollectionTypeRecursivePath);
