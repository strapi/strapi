import React from 'react';

import { LoadingIndicatorPage, useRBAC } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import { selectAdminPermissions } from '../../../../App/selectors';
import EditPage from '../EditPage';

const ProtectedEditPage = () => {
  const permissions = useSelector(selectAdminPermissions);

  const {
    isLoading,
    allowedActions: { canRead, canUpdate },
  } = useRBAC({
    read: permissions.settings.roles.read,
    update: permissions.settings.roles.update,
  });

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!canRead && !canUpdate) {
    return <Redirect to="/" />;
  }

  return <EditPage />;
};

export default ProtectedEditPage;
