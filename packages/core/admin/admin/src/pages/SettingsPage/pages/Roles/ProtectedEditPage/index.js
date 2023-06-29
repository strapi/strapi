import React from 'react';

import { LoadingIndicatorPage, useRBAC } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { selectAdminPermissions } from '../../../../App/selectors';
import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const permissions = useSelector(selectAdminPermissions);

  // TODO: this is necessary because otherwise we run into an
  // infinite rendering loop
  const permissionsMemoized = React.useMemo(() => {
    return {
      read: permissions.settings.roles.read,
      update: permissions.settings.roles.update,
    };
  }, [permissions.settings.roles.read, permissions.settings.roles.update]);

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useRBAC(permissionsMemoized);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!canRead && !canUpdate) {
    return <Redirect to="/" />;
  }

  return <EditPage />;
};

export default ProtectedEditPage;
