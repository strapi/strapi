import { useRBAC } from '@strapi/admin/strapi-admin';

// TODO: replace this import with the import from constants file when it will be migrated to TS
import { PERMISSIONS } from '../newConstants';

const { main, ...restPermissions } = PERMISSIONS;

export const useMediaLibraryPermissions = () => {
  const { allowedActions, isLoading } = useRBAC(restPermissions);

  return { ...allowedActions, isLoading };
};
