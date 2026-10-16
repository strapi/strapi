import type { errors } from '@strapi/utils';

/** `requiredRoles` lives on `admin::role.mfaRequired`, not in the stored document, but is read
 * and written through the same endpoint. */
export type MfaEnforcementMode = 'off' | 'optional' | 'required';

export interface MfaEnforcement {
  mode: MfaEnforcementMode;
  graceDays: number;
}

export interface MfaEnforcementSettings extends MfaEnforcement {
  requiredRoles: string[];
}

export interface TrustedDeviceSettings {
  enabled: boolean;
  days: number;
}

/** Turning this off deletes every registered passkey, hence the credentials on that `PUT`. */
export interface PasskeySettings {
  enabled: boolean;
}

export interface SecuritySettings {
  mfa: MfaEnforcementSettings;
  trustedDevices: TrustedDeviceSettings;
  passkeys: PasskeySettings;
}

export declare namespace GetSecuritySettings {
  export interface Response {
    data: SecuritySettings;
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /admin/security-settings - per object: a key present in the body replaces its object whole,
 * an absent one is untouched, a body with none is rejected. `password` (and `code` when enrolled)
 * are required only when the change relaxes protection.
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

/**
 * GET /security-settings/mfa-impact - how many active accounts a proposed enforcement would put on
 * the clock, and how many of them are already enrolled. Read before a raise is saved, so the
 * administrator sees the blast radius before committing to it.
 */
export declare namespace GetMfaImpact {
  export interface Request {
    query: {
      mode: MfaEnforcementMode;
      requiredRoles?: string[];
    };
  }
  export interface Response {
    data: {
      affected: number;
      enrolled: number;
    };
  }
}
