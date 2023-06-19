import React, { useMemo } from 'react';

import { LoadingIndicatorPage, useAppInfo, useRBAC } from '@strapi/helper-plugin';
import { Redirect } from 'react-router-dom';

import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const { permissions: appPermissions } = useAppInfo();
  const permissions = useMemo(() => {
    return {
      read: appPermissions.settings.roles.read,
      update: appPermissions.settings.roles.update,
    };
  }, [appPermissions]);

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useRBAC(permissions);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!canRead && !canUpdate) {
    return <Redirect to="/" />;
  }

  return <EditPage />;
};

export default ProtectedEditPage;
