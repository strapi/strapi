import { useRBAC, type AllowedActions } from '@strapi/admin/strapi-admin';

import { PERMISSIONS } from '../constants';

const { main: _main, ...restPermissions } = PERMISSIONS;

export const useMediaLibraryPermissions = (): AllowedActions & { isLoading: boolean } => {
  const { allowedActions, isLoading } = useRBAC(restPermissions);

  return { ...allowedActions, isLoading };
};
