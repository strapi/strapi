import type { Entity as TEntity } from '@strapi/types';

export interface Entity {
  id: TEntity.ID;
  createdAt: string;
  updatedAt: string;
}

export interface Permission extends Entity {
  action: string;
  actionParameters: object;
  subject?: string | null;
  properties: {
    fields?: string[];
    locales?: string[];
    [key: string]: any;
  };
  conditions: string[];
}

export interface AdminRole extends Entity {
  name: string;
  code: string;
  description?: string;
  users: AdminUser[];
  permissions: Permission[];
}

export interface AdminUser extends Entity {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  password?: string;
  resetPasswordToken?: string | null;
  registrationToken?: string | null;
  isActive: boolean;
  roles: AdminRole[];
  blocked: boolean;
  preferedLanguage?: string;
}

export type SanitizedAdminUser = Omit<
  AdminUser,
  'password' | 'resetPasswordToken' | 'registrationToken'
>;

export type SanitizedAdminRole = Omit<AdminRole, 'users' | 'permissions'>;
