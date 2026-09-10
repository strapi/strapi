import type { errors } from '@strapi/utils';

/**
 * Enforcement of admin two-factor authentication. Stored in `core_store` under the admin
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

/**
 * Trusted devices: whether a user may trust a browser after a verified code, and for how many days.
 * Stored beside `mfa` in the same `security-settings` document. `days` is an integer 1..90.
 */
export interface TrustedDeviceSettings {
  enabled: boolean;
  days: number;
}

/**
 * Passkeys: whether users may register and sign in with a passkey. Stored beside `mfa` and
 * `trustedDevices` in the same `security-settings` document. Turning it off deletes every
 * registered passkey, which is why the `PUT` that does so carries credentials like a downgrade.
 */
export interface PasskeySettings {
  enabled: boolean;
}

export interface SecuritySettings {
  mfa: MfaEnforcementSettings;
  trustedDevices: TrustedDeviceSettings;
  passkeys: PasskeySettings;
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
 * PUT /admin/security-settings - per object, no merge inside an object: each of `mfa` /
 * `trustedDevices` / `passkeys` present in the body replaces its object whole, an absent one is
 * untouched, a body with none is rejected. `password` (and `code` when the caller is enrolled) are
 * required only when the change relaxes protection: a lower `mode`, a role removed from
 * `requiredRoles`, a longer `graceDays`, enabling trusted devices, a longer trust `days` while
 * enabled, or disabling passkeys -- which deletes every phishing-resistant credential every
 * administrator holds.
 */
export declare namespace UpdateSecuritySettings {
  export interface Request {
    body: {
      mfa?: MfaEnforcementSettings;
      trustedDevices?: TrustedDeviceSettings;
      passkeys?: PasskeySettings;
      password?: string;
      code?: string;
    };
  }

  export interface Response {
    data: SecuritySettings;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
