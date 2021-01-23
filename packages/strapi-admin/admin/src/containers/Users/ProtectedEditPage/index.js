import React, { useEffect, useMemo } from 'react';
import { useUserPermissions, LoadingIndicatorPage } from 'strapi-helper-plugin';
import { Redirect, useLocation } from 'react-router-dom';
import { get } from 'lodash';
import adminPermissions from '../../../permissions';
import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const permissions = useMemo(() => {
    return {
      read: adminPermissions.settings.users.read,
      update: adminPermissions.settings.users.update,
    };
  }, []);

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useUserPermissions(permissions);
  const { state } = useLocation();
  const from = get(state, 'from', '/');

  useEffect(() => {
    if (!isLoading) {
      if (!canRead && !canUpdate) {
        strapi.notification.toggle({
          type: 'info',
          message: { id: 'notification.permission.not-allowed-read' },
        });
      }
    }
  }, [isLoading, canRead, canUpdate]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!canRead && !canUpdate) {
    return <Redirect to={from} />;
  }

  return <EditPage canUpdate={canUpdate} />;
};

export default ProtectedEditPage;
