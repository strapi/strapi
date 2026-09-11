import type { errors } from '@strapi/utils';

/**
 * Stored in `core_store` under `security-settings`, except `requiredRoles`, which lives on
 * `admin::role.mfaRequired` and is read and written through the same endpoint. `required` covers
 * everyone with a local password; `optional` defers to those per-role flags.
 */
export type MfaEnforcementMode = 'off' | 'optional' | 'required';

export interface MfaEnforcement {
  mode: MfaEnforcementMode;
  /** Days between a required user's first session and the lock. 1..30. */
  graceDays: number;
}

export interface MfaEnforcementSettings extends MfaEnforcement {
  /** `admin::role` ids as strings, like `ssoLockedRoles`. */
  requiredRoles: string[];
}

/** Stored beside `mfa` in the same document. `days` is 1..90. */
export interface TrustedDeviceSettings {
  enabled: boolean;
  days: number;
}

/** Turning this off deletes every registered passkey, which is why the `PUT` that does so carries
 * credentials like a downgrade. */
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
