import React, { memo, useMemo } from 'react';
import { Switch, Route } from 'react-router-dom';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import { ContentTypeLayoutContext } from '../../contexts';
import { useFetchContentTypeLayout } from '../../hooks';
import { formatLayoutToApi } from '../../utils';
import EditView from '../EditView';
import EditSettingsView from '../EditSettingsView';
import ListView from '../ListView';
import ListSettingsView from '../ListSettingsView';

const CollectionTypeRecursivePath = ({
  match: {
    params: { slug },
    url,
  },
}) => {
  const { isLoading, layout, updateLayout } = useFetchContentTypeLayout(slug);

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

  const uid = get(layout, ['contentType', 'uid'], null);

  // This statement is needed in order to prevent the CollectionTypeFormWrapper effects clean up phase to be run twice.
  // What can happen is that when navigating from one entry to another the cleanup phase of the fetch data effect is run twice : once when
  // unmounting, once when the url changes.
  // Since it can happen that the layout there's a delay when the layout is being fetched and the url changes adding the uid ! == slug
  // statement prevent the component from being mounted and unmounted twice.
  if (uid !== slug || isLoading) {
    return <LoadingIndicatorPage />;
  }

  const renderRoute = (
    {
      location: { state },
      history: { goBack },
      match: {
        params: { id, origin },
      },
    },
    Component
  ) => {
    return (
      <Component
        slug={slug}
        layout={layout}
        state={state}
        goBack={goBack}
        id={id}
        origin={origin}
      />
    );
  };

  const routes = [
    { path: ':id/clone/:origin', comp: EditView },
    { path: ':id', comp: EditView },
    { path: '', comp: ListView },
  ].map(({ path, comp }) => (
    <Route key={path} path={`${url}/${path}`} render={props => renderRoute(props, comp)} />
  ));

  return (
    <ContentTypeLayoutContext.Provider value={layout}>
      <Switch>
        <Route path={`${url}/configurations/list`}>
          <CheckPagePermissions permissions={pluginPermissions.collectionTypesConfigurations}>
            <ListSettingsView
              layout={rawContentTypeLayout}
              slug={slug}
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
              slug={slug}
              updateLayout={updateLayout}
            />
          </CheckPagePermissions>
        </Route>
        {routes}
      </Switch>
    </ContentTypeLayoutContext.Provider>
  );
};

CollectionTypeRecursivePath.propTypes = {
  match: PropTypes.shape({
    url: PropTypes.string.isRequired,
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default memo(CollectionTypeRecursivePath);
