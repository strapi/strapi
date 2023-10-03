import { SUPER_ADMIN_CODE } from '../services/constants';

/**
 * Create a new user model by merging default and specified attributes
 * @param attributes A partial user object
 */
export function createUser(attributes: any) {
  return {
    roles: [],
    isActive: false,
    username: null,
    ...attributes,
  };
}

export const hasSuperAdminRole = (user: any) => {
  return user.roles.filter((role: any) => role.code === SUPER_ADMIN_CODE).length > 0;
};

export const ADMIN_USER_ALLOWED_FIELDS = ['id', 'firstname', 'lastname', 'username'];

export default {
  createUser,
  hasSuperAdminRole,
  ADMIN_USER_ALLOWED_FIELDS,
};
