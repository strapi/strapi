import React, { createContext, useContext } from 'react';

const UsersPermissions = createContext({});

/** @param {{ children: React.ReactNode, value: object }} props */
const UsersPermissionsProvider = ({ children, value }) => {
  return <UsersPermissions.Provider value={value}>{children}</UsersPermissions.Provider>;
};

const useUsersPermissions = () => useContext(UsersPermissions);

export { UsersPermissions, UsersPermissionsProvider, useUsersPermissions };
