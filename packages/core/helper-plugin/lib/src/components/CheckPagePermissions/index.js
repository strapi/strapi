import React, { useEffect, useRef, useState } from 'react';
import { Redirect } from 'react-router-dom';
import PropTypes from 'prop-types';
import useNotification from '../../hooks/useNotification';
import useRBACProvider from '../../hooks/useRBACProvider';
import hasPermissions from '../../utils/hasPermissions';
import LoadingIndicatorPage from '../LoadingIndicatorPage';

const CheckPagePermissions = ({ permissions, children }) => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const { allPermissions } = useRBACProvider();
  const toggleNotification = useNotification();

  const [state, setState] = useState({ isLoading: true, canAccess: false });
  const isMounted = useRef(true);

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
    return <LoadingIndicatorPage />;
  }

  if (!state.canAccess) {
    return <Redirect to="/" />;
  }

  return children;
};

CheckPagePermissions.defaultProps = {
  permissions: [],
};

CheckPagePermissions.propTypes = {
  children: PropTypes.node.isRequired,
  permissions: PropTypes.array,
};

export default CheckPagePermissions;
