import constants from '../services/constants';

import type {
  AdminUser,
  AdminRole,
  AdminUserCreationPayload,
} from '../../../shared/contracts/shared';

const { SUPER_ADMIN_CODE } = constants;

/**
 * Create a new user model by merging default and specified attributes
 * @param attributes A partial user object
 */
export function createUser(attributes: Partial<AdminUserCreationPayload>) {
  return {
    roles: [],
    isActive: false,
    username: null,
    ...attributes,
  };
}

export const hasSuperAdminRole = (user: AdminUser) => {
  return user.roles.filter((role: AdminRole) => role.code === SUPER_ADMIN_CODE).length > 0;
};

export const ADMIN_USER_ALLOWED_FIELDS = ['id', 'firstname', 'lastname', 'username'];

export default {
  createUser,
  hasSuperAdminRole,
  ADMIN_USER_ALLOWED_FIELDS,
};
