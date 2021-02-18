import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const UsersPermissions = createContext({});

const UsersPermissionsProvider = ({ children, value }) => {
  return <UsersPermissions.Provider value={value}>{children}</UsersPermissions.Provider>;
};

const useUsersPermissions = () => useContext(UsersPermissions);

UsersPermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.object.isRequired,
};

export { UsersPermissions, UsersPermissionsProvider, useUsersPermissions };
