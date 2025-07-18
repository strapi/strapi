import { useRBAC, type AllowedActions } from '@strapi/admin/strapi-admin';

import { PERMISSIONS } from '../constants';

const { main: _main, ...restPermissions } = PERMISSIONS;
const allPermissions = Object.values(restPermissions).flat();

export const useMediaLibraryPermissions = (): AllowedActions & { isLoading: boolean } => {
  const { allowedActions, isLoading } = useRBAC(allPermissions);

  return { ...allowedActions, isLoading };
};
