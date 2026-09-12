import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import type { Data } from '@strapi/types';
import type { LoginMfa } from './authentication';
import type { AdminUser } from './shared';

/** Never carries the secret, an otpauth URI or a recovery code. */
export declare namespace Me {
  export interface Response {
    data: {
      enabled: boolean;
      enabledAt: AdminUser['mfaEnabledAt'];
      recoveryCodesRemaining: number;
      codesAcknowledged: boolean;
      required: boolean;
      graceUntil: string | null;
      trustedDevicesEnabled: boolean;
      passkeysEnabled: boolean;
      /** False for an SSO-only administrator, whom `updateSettings` exempts from presenting credentials
       * to turn passkeys off -- so the UI must not route them into a dialog they cannot complete. */
      hasLocalPassword: boolean;
    };
  }
}

/** `secret`/`otpauthUri` are returned exactly once. */
export declare namespace Enrol {
  export interface Request {
    body: {
      password: string;
      /** Required when already enrolled; ignored on a fresh enrolment. */
      code?: string;
    };
  }

  export interface Response {
    data: {
      secret: string;
      otpauthUri: string;
    };
  }
}

/** The recovery codes minted here are returned exactly once. */
export declare namespace VerifyEnrolment {
  export interface Request {
    body: {
      code: string;
    };
  }

  export interface Response {
    data: {
      recoveryCodes: string[];
      replaced: boolean;
    };
  }
}

/** The same re-authentication gate as /mfa/disable. */
export declare namespace RegenerateRecoveryCodes {
  export interface Request {
    body: {
      password: string;
      code: string;
    };
  }

  export interface Response {
    data: {
      recoveryCodes: string[];
    };
  }
}

export declare namespace AcknowledgeRecoveryCodes {
  export interface Request {
    body?: {};
  }
}

/** Evicts every *other* device. */
export declare namespace Disable {
  export interface Request {
    body: {
      password: string;
      code: string;
    };
  }
}

/** POST /mfa/users/:id/unlock - 204; 404 unknown user; 400 when not locked. No grace is stamped:
 * the user's next session starts a fresh window. */
export declare namespace UnlockUser {
  export interface Params {
    id: Data.ID;
  }
}

/** POST /mfa/users/:id/reset - 204 even for an account that was not enrolled; 404 unknown user.
 * `admin:reset-user-mfa` on the CLI does the same for when nobody can sign in at all. */
export declare namespace ResetUser {
  export interface Params {
    id: Data.ID;
  }
}

/** Never carries the token or its hash. `current` means this row is the browser making the
 * request. */
export interface TrustedDevice {
  id: string;
  deviceName: string | null;
  createdAt: string;
  /** The *effective* expiry: min(stored expiry, createdAt + the current `days` setting). */
  expiresAt: string;
  lastUsedAt: string | null;
  current: boolean;
}

/** GET /mfa/trusted-devices - current first, then newest. */
export declare namespace ListTrustedDevices {
  export interface Response {
    data: TrustedDevice[];
  }
}

/** DELETE /mfa/trusted-devices/:id - 204, or 404 when the row is not the caller's. Without `:id`
 * it revokes every one. Either clears the trust cookie when it covers the current browser. */
export declare namespace RevokeTrustedDevice {
  export interface Params {
    id: string;
  }
}

/** The same rows without `current`. */
export declare namespace ListUserTrustedDevices {
  export interface Params {
    id: Data.ID;
  }
  export interface Response {
    data: Array<Omit<TrustedDevice, 'current'>>;
  }
}

export declare namespace RevokeUserTrustedDevices {
  export interface Params {
    id: Data.ID;
  }
}

/** Shared with the client so it can stop offering "Add a passkey" rather than spend a password
 * and a live code on a guaranteed rejection. */
export const MAX_PASSKEYS_PER_USER = 10;

/** `publicKey`, `counter`, `credentialId` and `transports` never leave the server. */
export interface Passkey {
  id: string;
  /** There is no rename route. */
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** GET /mfa/passkeys - empty while the policy is off, so this and the administrator count agree. */
export declare namespace ListPasskeys {
  export interface Response {
    data: Passkey[];
  }
}

/**
 * POST /mfa/passkeys/options - costs the current password *and* a live second factor. Typed from
 * `@simplewebauthn/browser`, not `/server`, which this shared file must not pull in at runtime.
 */
export declare namespace PasskeyRegistrationOptions {
  export interface Request {
    body: {
      password: string;
      code: string;
    };
  }

  export interface Response {
    data: PublicKeyCredentialCreationOptionsJSON;
  }
}

/** No password or code: the options route already authorised this single-use ceremony. */
export declare namespace RegisterPasskey {
  export interface Request {
    body: {
      name: string;
      registration: RegistrationResponseJSON;
    };
  }

  export interface Response {
    data: Passkey;
  }
}

/** DELETE /mfa/passkeys/:id - 204, or 404 when the row is not theirs. Costs nothing and works
 * while the policy is off: removing a credential is never the dangerous direction. */
export declare namespace DeletePasskey {
  export interface Params {
    id: string;
  }
}

/** GET /mfa/users/:id/passkeys - a count, never an inventory of somebody's hardware. */
export declare namespace ListUserPasskeys {
  export interface Params {
    id: Data.ID;
  }
  export interface Response {
    data: {
      count: number;
    };
  }
}

/** Works while the policy is off. */
export declare namespace DeleteUserPasskeys {
  export interface Params {
    id: Data.ID;
  }
}

/**
 * POST /admin/login/mfa/webauthn/options - unauthenticated; the challenge token is the only
 * credential. Charges no attempt, because it evaluates no factor.
 */
export declare namespace MfaWebauthnOptions {
  export interface Request {
    body: {
      challengeToken: string;
    };
  }

  export interface Response {
    data: PublicKeyCredentialRequestOptionsJSON;
  }
}

/**
 * POST /admin/login/mfa/webauthn - `issueSession` reads `deviceId` and `rememberMe` from the body,
 * so omitting them loses the caller's "remember me" and leaves a trusted row's `deviceId` null.
 */
export declare namespace MfaWebauthnLogin {
  export interface Request {
    body: {
      challengeToken: string;
      assertion: AuthenticationResponseJSON;
      trustDevice?: boolean;
      deviceId?: string;
      rememberMe?: boolean;
    };
  }

  export type Response = LoginMfa.Response;
}

/** Declared here, not on the server: the server writes these rows and the client renders them. */
export type MfaEventType =
  | 'enabled'
  | 'disabled'
  | 'reset'
  | 'challenge_failed'
  | 'recovery_code_used'
  | 'recovery_codes_issued'
  | 'grace_started'
  | 'locked'
  | 'unlocked'
  | 'authenticator_replaced'
  | 'device_trusted'
  | 'device_trust_revoked'
  | 'passkey_registered'
  | 'passkey_removed';

/** Announced on the hub for EE audit logging, but never written as a row: a notice on every *use*
 * of a factor would bury the ones that report a change to it. */
export type MfaAuditOnlyNotice = 'trusted_device_used' | 'passkey_used';

/** `recovery_codes_issued` is a row type but not a notice: it is the acknowledgement marker. An
 * `Exclude` rather than a second list, so a new row type cannot leave the feed's type behind. */
export type MfaNoticeType = Exclude<MfaEventType, 'recovery_codes_issued'>;

export interface MfaEventNotice {
  id: Data.ID;
  type: MfaNoticeType;
  metadata: Record<string, unknown>;
  createdAt: string;
  seenAt: string | null;
}

export declare namespace Notices {
  export interface Response {
    data: MfaEventNotice[];
  }
}

/** POST /mfa/notices/seen - an absent `ids` marks every unseen notice; a present one is scoped to
 * those ids, and always to rows the caller owns. */
export declare namespace MarkNoticesSeen {
  export interface Request {
    body: {
      // Narrower than `Data.ID`: the validator is `yup.number().integer()`, so a string id would
      // typecheck here and always 400 at runtime.
      ids?: number[];
    };
  }
}
