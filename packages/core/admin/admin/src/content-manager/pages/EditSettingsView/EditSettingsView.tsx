import * as React from 'react';

import { AnErrorOccurred, CheckPagePermissions, LoadingIndicatorPage } from '@strapi/helper-plugin';
import { useParams } from 'react-router-dom';

import { useTypedSelector } from '../../../core/store/hooks';
import { useDocumentLayout } from '../../hooks/useDocumentLayout';
import { type SettingsViewComponentLayout, formatLayoutForSettingsView } from '../../utils/layouts';

import { SettingsForm } from './components/SettingsForm/SettingsForm';

const EditSettingsView = () => {
  const { slug } = useParams();
  const { isLoading, layout } = useDocumentLayout(slug);

  const { rawContentTypeLayout, rawComponentsLayouts } = React.useMemo(() => {
    let rawContentTypeLayout = null;
    let rawComponentsLayouts = null;

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
