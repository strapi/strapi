import { useRBAC } from '@strapi/helper-plugin';

import { useTypedSelector } from '../../../../core/store/hooks';
import { generatePermissionsObject } from '../../../utils/permissions';

const useAllowedActions = (slug: string) => {
  const viewPermissions = generatePermissionsObject(slug);
  const permissions = useTypedSelector((state) => state['content-manager_rbacManager'].permissions);
  const { allowedActions } = useRBAC(viewPermissions, permissions ?? []);
  return allowedActions;
};

export { useAllowedActions };
