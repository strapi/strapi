/**
 * What the Content Manager's Security panel of one end user and the plugin's admin API share.
 * Imported with relative paths by the server and the plugin admin. Every id is a `documentId`, and
 * no session token is ever among them.
 */

export interface UserSecuritySession {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface UserSecurityAccount {
  id: string;
  providerId: string;
}

export interface UserSecurityStatus {
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  lockedUntil: string | null;
}

/** `GET /end-users/users/:documentId/security` */
export interface UserSecurity {
  accounts: UserSecurityAccount[];
  twoFactor: boolean;
  passkeys: number;
  sessions: UserSecuritySession[];
  status: UserSecurityStatus;
}

export interface UserSecurityResponse {
  data: UserSecurity;
}

/** `POST /end-users/users/:documentId/ban`. `expiresAt` is a date-time; absent means no end. */
export interface BanUserRequest {
  reason?: string;
  expiresAt?: string;
}

/** A role as the permissions of a user name it */
export interface EffectivePermissionsRole {
  documentId: string;
  name: string;
  type: string;
}

/**
 * What one end user holds, as `GET /api/end-users/permissions/me` describes it for that user (core's
 * `describe` of their ability, and the roles it comes from). Per content type and data action the
 * rows are combined across the roles: fields are the union (null when any row covers every field),
 * conditions every name used, populateDepth the largest (null when any row has no limit).
 */
export interface EffectivePermissions {
  roles: EffectivePermissionsRole[];
  /** The route scopes the user may call: `api::note.note.find` */
  routes: string[];
  subjects: Record<
    string,
    Record<string, { fields: string[] | null; conditions: string[]; populateDepth: number | null }>
  >;
}

/** `GET /end-users/users/:documentId/effective-permissions` */
export interface EffectivePermissionsResponse {
  data: EffectivePermissions;
}
