import React, { useEffect, useMemo } from 'react';

import { LoadingIndicatorPage, useAppInfo, useNotification, useRBAC } from '@strapi/helper-plugin';
import { Redirect, useLocation } from 'react-router-dom';

import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const toggleNotification = useNotification();
  const { permissions: appPermissions } = useAppInfo();
  const permissions = useMemo(() => {
    return {
      read: appPermissions.settings.users.read,
      update: appPermissions.settings.users.update,
    };
  }, [appPermissions]);

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useRBAC(permissions);
  const { state } = useLocation();
  const from = state?.from ?? '/';

  useEffect(() => {
    if (!isLoading) {
      if (!canRead && !canUpdate) {
        toggleNotification({
          type: 'info',
          message: {
            id: 'notification.permission.not-allowed-read',
            defaultMessage: 'You are not allowed to see this document',
          },
        });
      }
    }
  }, [isLoading, canRead, canUpdate, toggleNotification]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!canRead && !canUpdate) {
    return <Redirect to={from} />;
  }

  return <EditPage canUpdate={canUpdate} />;
};

export default ProtectedEditPage;
