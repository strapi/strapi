import React, { createContext, useContext } from 'react';

interface UsersPermissionsContextValue {
  modifiedData?: Record<string, any>;
  selectedAction?: string;
  onChange: (event: { target: { name: string; value: any } }) => void;
  onChangeSelectAll: (event: { target: { name: string; value: any } }) => void;
  onSelectedAction: (actionName: string) => void;
  [key: string]: any;
}

interface UsersPermissionsProviderProps {
  children: React.ReactNode;
  value: UsersPermissionsContextValue;
}

const UsersPermissions = createContext<UsersPermissionsContextValue>(
  {} as UsersPermissionsContextValue
);

const UsersPermissionsProvider = ({ children, value }: UsersPermissionsProviderProps) => {
  return <UsersPermissions.Provider value={value}>{children}</UsersPermissions.Provider>;
};

const useUsersPermissions = () => useContext(UsersPermissions);

export { UsersPermissions, UsersPermissionsProvider, useUsersPermissions };
