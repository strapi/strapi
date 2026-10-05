import { createContext, useContext } from 'react';

import type { State } from '../../components/UsersPermissions/reducer';
import type { PermissionChangeEvent } from '../../types';

type ContextValue = State & {
  onChange: (event: PermissionChangeEvent) => void;
  onChangeSelectAll: (event: PermissionChangeEvent<boolean>) => void;
  onSelectedAction: (action: string) => void;
};

const UsersPermissions = createContext<ContextValue | undefined>(undefined);
const UsersPermissionsProvider = UsersPermissions.Provider;

/** Reads the permission editor state within its provider. */
const useUsersPermissions = () => {
  const context = useContext(UsersPermissions);
  if (context === undefined) {
    throw new Error('useUsersPermissions must be used within UsersPermissionsProvider');
  }
  return context;
};

export { UsersPermissions, UsersPermissionsProvider, useUsersPermissions };
