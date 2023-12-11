/**
 * This component renders all the routes for either multiple or single content types
 * including the settings views available.
 */

import * as React from 'react';

import { CheckPagePermissions, LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { useTypedSelector } from '../../core/store/hooks';
import { NotFoundPage } from '../../pages/NotFoundPage';
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

interface CollectionTypePagesProps
  extends RouteComponentProps<{ collectionType: string; slug: string }> {}

const CollectionTypePages = (props: CollectionTypePagesProps) => {
  const {
    match: {
      params: { collectionType, slug },
      path,
    },
  } = props;

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

  /**
   * We only support two types of collections.
   */
  if (collectionType !== 'collectionType' && collectionType !== 'singleType') {
    return <NotFoundPage />;
  }

  if (isLoading || !layout) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Switch>
      <Route
        path={path}
        exact
        render={({ history: { goBack } }) =>
          collectionType === 'collectionType' ? (
            <ListViewLayoutManager slug={slug} layout={layout} />
          ) : (
            <EditViewLayoutManager layout={layout} slug={slug} isSingleType goBack={goBack} />
          )
        }
      />
      <Route exact path={`${path}/configurations/edit`}>
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
      {collectionType === 'collectionType' ? (
        <>
          <Route path={`${path}/configurations/list`}>
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
          <Route
            path={`${path}/create/clone/:origin`}
            exact
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
            path={[`${path}/create`, `${path}/:id`]}
            exact
            render={({ history: { goBack }, match: { params } }) => (
              <EditViewLayoutManager
                slug={slug}
                layout={layout}
                goBack={goBack}
                id={'id' in params ? params.id : undefined}
              />
            )}
          />
        </>
      ) : null}
    </Switch>
  );
};

export { CollectionTypePages };
