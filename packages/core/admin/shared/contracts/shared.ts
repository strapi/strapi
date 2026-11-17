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
  // Private two-factor columns, declared so `SanitizedAdminUser` can omit them by name
  mfaSecret?: string | null;
  mfaEnabledAt?: string | Date | null;
  mfaLastUsedStep?: number | null;
  mfaPendingSecret?: string | null;
  mfaGraceUntil?: string | Date | null;
  mfaLockedAt?: string | Date | null;
  mfaPasskeyChallenge?: string | null;
  mfaPasskeyChallengeExpiresAt?: string | Date | null;
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
  'password' | 'resetPasswordToken' | 'resetPasswordTokenExpiresAt' | 'roles' | PrivateMfaField
> & {
  roles: SanitizedAdminRole[];
};

/**
 * The private two-factor columns; `PRIVATE_MFA_FIELDS` in `server/src/services/constants.ts` is the
 * runtime list, kept equal by a test since a shared contract cannot import server code.
 */
export type PrivateMfaField =
  | 'mfaSecret'
  | 'mfaEnabledAt'
  | 'mfaLastUsedStep'
  | 'mfaPendingSecret'
  | 'mfaGraceUntil'
  | 'mfaLockedAt'
  | 'mfaPasskeyChallenge'
  | 'mfaPasskeyChallengeExpiresAt';

export type AdminTokenOwner = Pick<
  AdminUser,
  'id' | 'firstname' | 'lastname' | 'username' | 'email'
>;
export interface AdminRole extends Entity {
  name: string;
  code: string;
  description?: string;
  mfaRequired?: boolean | null;
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
  fieldPath?: string;
}
