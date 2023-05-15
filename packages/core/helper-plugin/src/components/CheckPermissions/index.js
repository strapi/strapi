import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNotification } from '../../features/Notifications';

import hasPermissions from '../../utils/hasPermissions';
import { useRBACProvider } from '../../features/RBAC';

// NOTE: this component is very similar to the CheckPagePermissions
// except that it does not handle redirections nor loading state

const CheckPermissions = ({ permissions, children }) => {
  const { allPermissions } = useRBACProvider();
  const toggleNotification = useNotification();
  const [state, setState] = useState({ isLoading: true, canAccess: false });
  const isMounted = useRef(true);
  const abortController = new AbortController();
  const { signal } = abortController;

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setState({ isLoading: true, canAccess: false });

        const canAccess = await hasPermissions(allPermissions, permissions, signal);

        if (isMounted.current) {
          setState({ isLoading: false, canAccess });
        }
      } catch (err) {
        if (isMounted.current) {
          console.error(err);
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });

          setState({ isLoading: false });
        }
      }
    };

    checkPermission();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  useEffect(() => {
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

  return children;
};

CheckPermissions.defaultProps = {
  permissions: [],
};

CheckPermissions.propTypes = {
  children: PropTypes.node.isRequired,
  permissions: PropTypes.array,
};

export default CheckPermissions;
