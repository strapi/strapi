import { useRBAC } from '@strapi/helper-plugin';

import { PERMISSIONS } from '../constants';

const { main, ...restPermissions } = PERMISSIONS;

export const useMediaLibraryPermissions = () => {
  const { allowedActions, isLoading } = useRBAC(restPermissions);

  return { ...allowedActions, isLoading };
};
