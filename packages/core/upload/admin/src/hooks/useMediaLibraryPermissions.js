import { useMemo } from 'react';
import { useRBAC } from '@strapi/helper-plugin';
import omit from 'lodash/omit';
import pluginPermissions from '../permissions';

export const useMediaLibraryPermissions = () => {
  const permissions = useMemo(() => omit(pluginPermissions, 'main'), []);
  const { allowedActions, isLoading } = useRBAC(permissions);

  return { ...allowedActions, isLoading };
};
