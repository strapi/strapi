import React, { useEffect, useMemo } from 'react';
import { useRBAC, LoadingIndicatorPage, useNotification } from '@strapi/helper-plugin';
import { Redirect, useLocation } from 'react-router-dom';

import adminPermissions from '../../../../../permissions';
import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const toggleNotification = useNotification();
  const permissions = useMemo(() => {
    return {
      read: adminPermissions.settings.users.read,
      update: adminPermissions.settings.users.update,
    };
  }, []);

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
