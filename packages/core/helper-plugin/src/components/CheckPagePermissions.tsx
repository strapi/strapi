import * as React from 'react';

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
  const abortController = new AbortController();
  const { signal } = abortController;
  const { allPermissions } = useRBACProvider();
  const toggleNotification = useNotification();

  const [state, setState] = React.useState({ isLoading: true, canAccess: false });
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    const checkPermission = async () => {
      try {
        setState({ isLoading: true, canAccess: false });

        const canAccess = await hasPermissions(allPermissions || [], permissions, signal);

        if (isMounted.current) {
          setState({ isLoading: false, canAccess });
        }
      } catch (err) {
        if (isMounted.current) {
          console.error(err);

          toggleNotification?.({
            type: 'warning',
            message: { id: 'notification.error' },
          });

          setState({ isLoading: false, canAccess: false });
        }
      }
    };

    checkPermission();

    return () => {
      abortController.abort();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (state.isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!state.canAccess) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
};

export { CheckPagePermissions };
