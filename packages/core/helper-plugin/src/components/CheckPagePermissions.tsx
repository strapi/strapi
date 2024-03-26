import * as React from 'react';

import { useQuery } from 'react-query';
import { Redirect } from 'react-router-dom';

import { useNotification } from '../features/Notifications';
import { useRBACProvider } from '../features/RBAC';
import { PermissionToCheckAgainst, hasPermissions } from '../utils/hasPermissions';

import { LoadingIndicatorPage } from './LoadingIndicatorPage';

export interface CheckPagePermissionsProps {
  children: React.ReactNode;
  permissions?: PermissionToCheckAgainst[];
}

const CheckPagePermissions = ({
  permissions = [],
  children,
}: CheckPagePermissionsProps): React.JSX.Element => {
  const { allPermissions } = useRBACProvider();
  const toggleNotification = useNotification();

  const { data: canAccess, isLoading } = useQuery(
    ['checkPagePermissions', permissions, allPermissions],
    () => hasPermissions(allPermissions, permissions),
    {
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
    }
  );

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (canAccess === false) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
};

export { CheckPagePermissions };
