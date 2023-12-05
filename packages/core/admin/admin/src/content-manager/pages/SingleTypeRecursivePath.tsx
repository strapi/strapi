import * as React from 'react';

import { CheckPagePermissions, LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { useTypedSelector } from '../../core/store/hooks';
import { useFetchContentTypeLayout } from '../hooks/useFetchContentTypeLayout';
import {
  SettingsViewComponentLayout,
  SettingsViewContentTypeLayout,
  formatLayoutForSettingsView,
} from '../utils/layouts';

// @ts-expect-error – This will be done in CONTENT-1952
import EditSettingsView from './EditSettingsView';
import { EditViewLayoutManager } from './EditViewLayoutManager';

interface SingleTypeRecursivePathProps extends RouteComponentProps<{ slug: string }> {}

const SingleTypeRecursivePath = ({
  match: {
    params: { slug },
    url,
  },
}: SingleTypeRecursivePathProps) => {
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { isLoading, layout, updateLayout } = useFetchContentTypeLayout(slug);

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

  if (isLoading || !layout) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Switch>
      <Route path={`${url}/configurations/edit`}>
        <CheckPagePermissions permissions={permissions.contentManager?.singleTypesConfigurations}>
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
        path={url}
        render={({ history }) => (
          <EditViewLayoutManager layout={layout} slug={slug} isSingleType goBack={history.goBack} />
        )}
      />
    </Switch>
  );
};

export { SingleTypeRecursivePath };
