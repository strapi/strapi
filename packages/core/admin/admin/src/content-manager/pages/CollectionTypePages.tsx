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
  if (collectionType !== 'collection-types' && collectionType !== 'single-types') {
    return <NotFoundPage />;
  }

  if (isLoading || !layout) {
    return <LoadingIndicatorPage />;
  }

  /**
   * We do this cast so the params are correctly inferred on the render props.
   */
  const currentPath = path as `/content-manager/:collectionType/:slug`;

  return (
    <Switch>
      <Route
        path={currentPath}
        exact
        render={(props) =>
          collectionType === 'collection-types' ? (
            <ListViewLayoutManager slug={slug} layout={layout} />
          ) : (
            <EditViewLayoutManager layout={layout} {...props} />
          )
        }
      />
      <Route exact path={`${currentPath}/configurations/edit`}>
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
      {collectionType === 'collection-types' ? (
        <>
          <Route path={`${currentPath}/configurations/list`}>
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
            path={`${currentPath}/create/clone/:origin`}
            exact
            render={(props) => <EditViewLayoutManager layout={layout} {...props} />}
          />
          <Route
            path={[`${currentPath}/create`, `${currentPath}/:id`]}
            exact
            render={(props) => <EditViewLayoutManager layout={layout} {...props} />}
          />
        </>
      ) : null}
    </Switch>
  );
};

export { CollectionTypePages };
