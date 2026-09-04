import type { errors } from '@strapi/utils';

/**
 * Enforcement of admin two-factor authentication (cycle 2). Stored in `core_store` under the admin
 * store key `security-settings` as `{ mfa: { mode, graceDays } }`; `requiredRoles` is not stored
 * here but on `admin::role.mfaRequired`, and is read and written through the same endpoint.
 *
 * `off`: nothing required, no grace runs, locks are dormant. `optional`: per-role requirements
 * apply. `required`: everyone with a local password.
 */
export type MfaEnforcementMode = 'off' | 'optional' | 'required';

export interface MfaEnforcement {
  mode: MfaEnforcementMode;
  /** Days between a required user's first session and the lock. Integer, 1..30. */
  graceDays: number;
}

export interface MfaEnforcementSettings extends MfaEnforcement {
  /** `admin::role` ids (as strings, like `ssoLockedRoles`) whose members must enrol. */
  requiredRoles: string[];
}

export interface SecuritySettings {
  mfa: MfaEnforcementSettings;
}

/**
 * GET /admin/security-settings
 */
export declare namespace GetSecuritySettings {
  export interface Response {
    data: SecuritySettings;
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /admin/security-settings - whole `mfa` object, no merge. `password` (and `code` when the
 * caller is enrolled) are required only when the change lowers protection: a lower `mode`, or a
 * role removed from `requiredRoles`.
 */
export declare namespace UpdateSecuritySettings {
  export interface Request {
    body: {
      mfa: MfaEnforcementSettings;
      password?: string;
      code?: string;
    };
  }

  export interface Response {
    data: SecuritySettings;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
