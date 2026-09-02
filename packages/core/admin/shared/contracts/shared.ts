import type { Data, Struct, UID } from '@strapi/types';

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
    locales?: string[] | null;
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
  resetPasswordTokenExpiresAt?: string | Date | null;
  registrationToken?: string | null;
  isActive: boolean;
  roles: AdminRole[];
  blocked: boolean;
  preferedLanguage?: string;
  // Private columns backing native two-factor authentication (see
  // `server/src/content-types/User.ts`, all three `private: true`). Declared here only so
  // `SanitizedAdminUser` can omit them by name -- they must never reach a sanitized payload:
  // `mfaSecret` is AES-256-GCM ciphertext, and enrolment status/last-use timing are otherwise
  // enumerable from any user-bearing response.
  mfaSecret?: string | null;
  mfaEnabledAt?: string | Date | null;
  mfaLastUsedStep?: number | null;
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

export type SanitizedAdminUser = Omit<
  AdminUser,
  | 'password'
  | 'resetPasswordToken'
  | 'resetPasswordTokenExpiresAt'
  | 'roles'
  | 'mfaSecret'
  | 'mfaEnabledAt'
  | 'mfaLastUsedStep'
> & {
  roles: SanitizedAdminRole[];
};

export type AdminTokenOwner = Pick<
  AdminUser,
  'id' | 'firstname' | 'lastname' | 'username' | 'email'
>;
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

export interface FieldContentSourceMap {
  path: string;
  type: Struct.SchemaAttributes[string]['type'];
  documentId: string;
  locale: string | null;
  model?: UID.Schema;
  kind?: Struct.ContentTypeKind;
}
