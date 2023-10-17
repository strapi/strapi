import type { Entity } from '@strapi/types';
import constants from '../services/constants';
import { Permission } from './permission';

const { SUPER_ADMIN_CODE } = constants;

export type AdminUser = {
  id: Entity.ID;
  firstname?: string;
  lastname?: string;
  username?: string;
  email: string;
  password: string;
  resetPasswordToken?: string | null;
  registrationToken?: string | null;
  isActive: boolean;
  roles: AdminRole[];
  blocked: boolean;
  preferredLanguage?: string;
};

export type AdminRole = {
  id: Entity.ID;
  name: string;
  code: string;
  description?: string;
  users: AdminUser[];
  permissions: Permission[];
};

/**
 * Create a new user model by merging default and specified attributes
 * @param attributes A partial user object
 */
export function createUser(attributes: Partial<AdminUser>) {
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
