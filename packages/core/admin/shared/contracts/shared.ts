import type { Data } from '@strapi/types';

export interface Entity {
  id: Data.ID;
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

export type AdminUserCreationPayload = Omit<
  AdminUser,
  keyof Entity | 'roles' | 'isActive' | 'blocked'
> & {
  roles: Data.ID[];
};

export type AdminUserUpdatePayload = Omit<AdminUser, keyof Entity | 'roles'> & {
  roles: Data.ID[];
};

export type SanitizedAdminUser = Omit<AdminUser, 'password' | 'resetPasswordToken' | 'roles'> & {
  roles: SanitizedAdminRole[];
};
export interface AdminRole extends Entity {
  name: string;
  code: string;
  description?: string;
  users: AdminUser[];
  permissions: Permission[];
}

export type SanitizedAdminRole = Omit<
  AdminRole,
  'users' | 'permissions' | 'createdAt' | 'updatedAt'
>;

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}
