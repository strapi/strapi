import type { Entity } from '@strapi/types';

export type Permission = {
  id: Entity.ID;
  action: string;
  actionParameters: object;
  subject?: string | null;
  properties: {
    fields?: string[];
    locales?: string[];
    [key: string]: any;
  };
  conditions: string[];
};

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

export type SanitizedAdminUser = Omit<
  AdminUser,
  'password' | 'resetPasswordToken' | 'registrationToken' | 'roles'
>;

export type AdminRole = {
  id: Entity.ID;
  name: string;
  code: string;
  description?: string;
  users: AdminUser[];
  permissions: Permission[];
};

export type SanitizedAdminRole = Omit<AdminRole, 'users' | 'permissions'>;
