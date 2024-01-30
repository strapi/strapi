import * as React from 'react';

import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useAPIErrorHandler,
  useNotification,
} from '@strapi/helper-plugin';
import { useParams } from 'react-router-dom';

import { useTypedSelector } from '../../core/store/hooks';
import { useGetComponentConfigurationQuery } from '../services/components';
import { mergeMetasWithSchema } from '../utils/schemas';

import { selectSchemas } from './App';
import { SettingsForm } from './EditSettingsView/components/SettingsForm/SettingsForm';

const ComponentSettingsView = () => {
  const schemas = useTypedSelector(selectSchemas);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { uid } = useParams<{ uid: string }>();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();

  const { data, isLoading, error } = useGetComponentConfigurationQuery(uid!, {
    skip: !uid,
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  const layout = React.useMemo(
    () => (data ? mergeMetasWithSchema(data, schemas, 'component') : null),
    [data, schemas]
  );

  if (isLoading || !layout) {
    return <LoadingIndicatorPage />;
  }

  return (
    <CheckPagePermissions permissions={permissions.contentManager?.componentsConfigurations}>
      <SettingsForm components={layout.components} layout={layout.component} />
    </CheckPagePermissions>
  );
};

const ProtectedComponentSettingsView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.componentsConfigurations
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <ComponentSettingsView />
    </CheckPagePermissions>
  );
};

export { ComponentSettingsView, ProtectedComponentSettingsView };
