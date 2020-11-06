import React from 'react';
import { Switch, Route, useRouteMatch, useParams } from 'react-router-dom';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import { ContentTypeLayoutContext } from '../../contexts';
import { useFetchContentTypeLayout } from '../../hooks';
import EditView from '../EditView';
import EditSettingsView from '../EditSettingsView';

const SingleTypeRecursivePath = props => {
  const { url } = useRouteMatch();
  const { slug } = useParams();
  const { isLoading, layout } = useFetchContentTypeLayout(slug);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <ContentTypeLayoutContext.Provider value={layout}>
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
          render={() => <EditView layout={layout} slug={slug} isSingleType />}
        />
      </Switch>
    </ContentTypeLayoutContext.Provider>
  );
};

export default SingleTypeRecursivePath;
