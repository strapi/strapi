import { useRBAC } from '@strapi/admin/strapi-admin';

// TODO: Remove this import when the permissions are available in the constants
import { PERMISSIONS } from '../newConstants';

const { main, ...restPermissions } = PERMISSIONS;

export const useMediaLibraryPermissions = () => {
  const { allowedActions, isLoading } = useRBAC(restPermissions);

  return { ...allowedActions, isLoading };
};
