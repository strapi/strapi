import { useMemo } from 'react';

import { useRBAC } from '@strapi/helper-plugin';
import omit from 'lodash/omit';

import { PERMISSIONS } from '../constants';

export const useMediaLibraryPermissions = () => {
  const permissions = useMemo(() => omit(PERMISSIONS, 'main'), []);
  const { allowedActions, isLoading } = useRBAC(permissions);

  return { ...allowedActions, isLoading };
};
