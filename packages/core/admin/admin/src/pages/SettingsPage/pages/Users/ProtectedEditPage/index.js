import React, { useEffect } from 'react';

import { LoadingIndicatorPage, useNotification, useRBAC } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';
import { Redirect, useLocation } from 'react-router-dom';

import { selectAdminPermissions } from '../../../../App/selectors';
import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const toggleNotification = useNotification();
  const permissions = useSelector(selectAdminPermissions);

  const memoizedPermissions = React.useMemo(
    () => ({
      read: permissions.settings.users.read,
      update: permissions.settings.users.update,
    }),
    [permissions.settings.users]
  );

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useRBAC(memoizedPermissions);
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
