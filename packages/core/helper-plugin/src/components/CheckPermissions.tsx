import * as React from 'react';

import { useNotification } from '../features/Notifications';
import { useRBACProvider } from '../features/RBAC';
import { PermissionToCheckAgainst, hasPermissions } from '../utils/hasPermissions';

// NOTE: this component is very similar to the CheckPagePermissions
// except that it does not handle redirections nor loading state

export interface CheckPermissionsProps {
  children: React.ReactNode;
  permissions?: PermissionToCheckAgainst[];
}

const CheckPermissions = ({ permissions = [], children }: CheckPermissionsProps) => {
  const { allPermissions } = useRBACProvider();
  const toggleNotification = useNotification();
  const [state, setState] = React.useState({ isLoading: true, canAccess: false });
  const isMounted = React.useRef(true);
  const abortController = new AbortController();
  const { signal } = abortController;

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
    return null;
  }

  if (!state.canAccess) {
    return null;
  }

  return <>{children}</>;
};

export { CheckPermissions };
