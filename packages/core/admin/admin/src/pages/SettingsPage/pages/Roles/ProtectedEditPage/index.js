import React, { useMemo } from 'react';
import { useRBAC, LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Redirect } from 'react-router-dom';
import adminPermissions from '../../../../../permissions';
import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const permissions = useMemo(() => {
    return {
      read: adminPermissions.settings.roles.read,
      update: adminPermissions.settings.roles.update,
    };
  }, []);

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
