import * as React from 'react';

import { Box } from '@strapi/design-system';
import { CheckPagePermissions, LoadingIndicatorPage, AnErrorOccurred } from '@strapi/helper-plugin';
import { ErrorBoundary } from 'react-error-boundary';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { useTypedSelector } from '../../core/store/hooks';
import { useContentTypeLayout } from '../hooks/useLayouts';
import {
  SettingsViewComponentLayout,
  SettingsViewContentTypeLayout,
  formatLayoutForSettingsView,
} from '../utils/layouts';

// @ts-expect-error – This will be done in CONTENT-1952
import EditSettingsView from './EditSettingsView';
import { EditViewLayoutManager } from './EditViewLayoutManager';
// @ts-expect-error – This will be done in CONTENT-1953
import { ListSettingsView } from './ListSettingsView';
import { ListViewLayoutManager } from './ListViewLayoutManager';

interface CollectionTypeRecursivePathProps extends RouteComponentProps<{ slug: string }> {}

const CollectionTypeRecursivePath = ({
  match: {
    params: { slug },
    url,
  },
}: CollectionTypeRecursivePathProps) => {
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { isLoading, layout, updateLayout } = useContentTypeLayout(slug);

  const { rawContentTypeLayout, rawComponentsLayouts } = React.useMemo(() => {
    let rawContentTypeLayout: SettingsViewContentTypeLayout | null = null;
    let rawComponentsLayouts: Record<string, SettingsViewComponentLayout> | null = null;

    if (layout?.contentType) {
      rawContentTypeLayout = formatLayoutForSettingsView(layout.contentType);
    }

    if (layout?.components) {
      rawComponentsLayouts = Object.keys(layout.components).reduce<
        Record<string, SettingsViewComponentLayout>
      >((acc, current) => {
        acc[current] = formatLayoutForSettingsView(layout.components[current]);

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
  if (uid !== slug || isLoading || !layout) {
    return <LoadingIndicatorPage />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={() => (
        <Box padding={8}>
          <AnErrorOccurred />
        </Box>
      )}
    >
      <Switch>
        <Route path={`${url}/configurations/list`}>
          <CheckPagePermissions
            permissions={permissions.contentManager?.collectionTypesConfigurations}
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
            permissions={permissions.contentManager?.collectionTypesConfigurations}
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
        <Route
          path={`${url}/create/clone/:origin`}
          render={({
            history: { goBack },
            match: {
              params: { origin },
            },
          }) => (
            <EditViewLayoutManager slug={slug} layout={layout} goBack={goBack} origin={origin} />
          )}
        />
        <Route
          path={`${url}/create`}
          render={({ history: { goBack } }) => (
            <EditViewLayoutManager slug={slug} layout={layout} goBack={goBack} />
          )}
        />
        <Route
          path={`${url}/:id`}
          render={({
            history: { goBack },
            match: {
              params: { id },
            },
          }) => <EditViewLayoutManager slug={slug} layout={layout} goBack={goBack} id={id} />}
        />
        <Route
          path={`${url}`}
          render={() => <ListViewLayoutManager slug={slug} layout={layout} />}
        />
      </Switch>
    </ErrorBoundary>
  );
};

export { CollectionTypeRecursivePath };
