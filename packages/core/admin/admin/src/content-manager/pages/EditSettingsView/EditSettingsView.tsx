import * as React from 'react';

import { AnErrorOccurred, CheckPagePermissions, LoadingIndicatorPage } from '@strapi/helper-plugin';

import { useTypedSelector } from '../../../core/store/hooks';
import { useDocLayout } from '../../hooks/useDocumentLayout';
import { type SettingsViewComponentLayout, formatLayoutForSettingsView } from '../../utils/layouts';

import { SettingsForm } from './components/SettingsForm/SettingsForm';

const EditSettingsView = () => {
  const {
    isLoading,
    edit: { layout, components },
  } = useDocLayout();

  const { rawContentTypeLayout, rawComponentsLayouts } = React.useMemo(() => {
    // @ts-expect-error – TODO: remove this & fix the page
    const rawContentTypeLayout = formatLayoutForSettingsView(layout);

    const rawComponentsLayouts = Object.keys(components).reduce<
      Record<string, SettingsViewComponentLayout>
    >((acc, current) => {
      // @ts-expect-error – TODO: remove this & fix the page
      acc[current] = formatLayoutForSettingsView(components[current]);

      return acc;
    }, {});

    return { rawContentTypeLayout, rawComponentsLayouts };
  }, [components, layout]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!rawContentTypeLayout || !rawComponentsLayouts) {
    return <AnErrorOccurred />;
  }

  return <SettingsForm layout={rawContentTypeLayout} components={rawComponentsLayouts} />;
};

const ProtectedEditSettingsView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.collectionTypesConfigurations
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <EditSettingsView />
    </CheckPagePermissions>
  );
};

export { ProtectedEditSettingsView, EditSettingsView };
