import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { LoadingIndicatorPage, UserProvider, request } from 'strapi-helper-plugin';
import {
  getUserPermissions,
  getUserPermissionsError,
  getUserPermissionsSucceeded,
} from './actions';
import makeSelectPermissionsManager from './selectors';

const PermissionsManager = ({
  children,
  isLoading,
  getUserPermissions,
  getUserPermissionsError,
  getUserPermissionsSucceeded,
  userPermissions,
}) => {
  const fetchUserPermissions = async (resetState = false) => {
    if (resetState) {
      // Show a loader
      getUserPermissions();
    }

    try {
      const { data } = await request('/admin/users/me/permissions', { method: 'GET' });

      getUserPermissionsSucceeded(data);
    } catch (err) {
      console.error(err);
      getUserPermissionsError(err);
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
  getUserPermissions: PropTypes.func.isRequired,
  getUserPermissionsError: PropTypes.func.isRequired,
  getUserPermissionsSucceeded: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  userPermissions: PropTypes.array.isRequired,
};

const mapStateToProps = makeSelectPermissionsManager();

const mapDispatchToProps = dispatch => {
  return bindActionCreators(
    {
      getUserPermissions,
      getUserPermissionsError,
      getUserPermissionsSucceeded,
    },
    dispatch
  );
};

const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect)(PermissionsManager);
