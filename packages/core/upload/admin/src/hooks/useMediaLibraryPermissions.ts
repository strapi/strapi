import { useRBAC } from '@strapi/admin/strapi-admin';

import { PERMISSIONS } from '../constants';

const { main: _main, ...restPermissions } = PERMISSIONS;

type UseRBACReturnType = ReturnType<typeof useRBAC>;

type AllowedActionsType = UseRBACReturnType['allowedActions'];

export const useMediaLibraryPermissions = (): AllowedActionsType & { isLoading: boolean } => {
  const { allowedActions, isLoading } = useRBAC(restPermissions);

  return { ...allowedActions, isLoading };
};
