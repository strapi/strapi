import React, { memo, useMemo } from 'react';

import { CheckPagePermissions, LoadingIndicatorPage } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { ErrorBoundary } from 'react-error-boundary';
import { useSelector } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import { selectAdminPermissions } from '../../../pages/App/selectors';
import { ContentTypeLayoutContext } from '../../contexts';
import { useFetchContentTypeLayout } from '../../hooks';
import { formatLayoutToApi } from '../../utils';
import EditSettingsView from '../EditSettingsView';
import EditViewLayoutManager from '../EditViewLayoutManager';
import { ListSettingsView } from '../ListSettingsView';
import ListViewLayout from '../ListViewLayoutManager';

import ErrorFallback from './components/ErrorFallback';

const CollectionTypeRecursivePath = ({
  match: {
    params: { slug },
    url,
  },
}) => {
  const permissions = useSelector(selectAdminPermissions);
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

  const uid = layout?.contentType?.uid ?? null;

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
    { path: 'create/clone/:origin', comp: EditViewLayoutManager },
    { path: 'create', comp: EditViewLayoutManager },
    { path: ':id', comp: EditViewLayoutManager },
    { path: '', comp: ListViewLayout },
  ].map(({ path, comp }) => (
    <Route key={path} path={`${url}/${path}`} render={(props) => renderRoute(props, comp)} />
  ));

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ContentTypeLayoutContext.Provider value={layout}>
        <Switch>
          <Route path={`${url}/configurations/list`}>
            <CheckPagePermissions
              permissions={permissions.contentManager.collectionTypesConfigurations}
            >
              <ListSettingsView
                layout={rawContentTypeLayout}
                slug={slug}
                updateLayout={updateLayout}
              />
            </CheckPagePermissions>
          </Route>
          <Route path={`${url}/configurations/edit`}>
            <CheckPagePermissions
              permissions={permissions.contentManager.collectionTypesConfigurations}
            >
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
    </ErrorBoundary>
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
