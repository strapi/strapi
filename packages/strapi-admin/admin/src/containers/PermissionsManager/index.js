import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { LoadingIndicatorPage, UserProvider, request } from 'strapi-helper-plugin';
import {
  getUserPermissions,
  getUserPermissionsError,
  getUserPermissionsSucceeded,
} from './actions';

const PermissionsManager = ({ children }) => {
  const { isLoading, userPermissions } = useSelector(state => state.get('permissionsManager'));

  const dispatch = useDispatch();
  const fetchUserPermissions = async (resetState = false) => {
    if (resetState) {
      // Show a loader
      dispatch(getUserPermissions());
    }

    try {
      const { data } = await request('/admin/users/me/permissions', { method: 'GET' });

      dispatch(getUserPermissionsSucceeded(data));
    } catch (err) {
      console.error(err);
      dispatch(getUserPermissionsError(err));
    }
  };

  useEffect(() => {
    fetchUserPermissions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return <UserProvider value={{ userPermissions, fetchUserPermissions }}>{children}</UserProvider>;
};

PermissionsManager.defaultProps = {};

PermissionsManager.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PermissionsManager;
