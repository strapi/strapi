import type { Data } from '@strapi/types';
import type { AdminUser } from './shared';
import type { Login } from './authentication';

/**
 * /mfa/me - Current second-factor status for the authenticated admin user. Never carries the
 * secret, an otpauth URI or a recovery code: enrolment state and remaining-code count only.
 */
export declare namespace Me {
  export interface Response {
    data: {
      enabled: boolean;
      enabledAt: AdminUser['mfaEnabledAt'];
      recoveryCodesRemaining: number;
      codesAcknowledged: boolean;
      /** Cycle 2: policy requires this account to be enrolled. */
      required: boolean;
      /** ISO deadline of the running grace period, or null. */
      graceUntil: string | null;
      /** Cycle 3: whether the organisation lets this user trust a browser after a code. */
      trustedDevicesEnabled: boolean;
    };
  }
}

/**
 * /mfa/enrol - Start enrolment: re-authenticates with the current password and issues a fresh
 * TOTP secret. `secret`/`otpauthUri` are returned exactly once, here, and never again.
 */
export declare namespace Enrol {
  export interface Request {
    body: {
      password: string;
      /**
       * Required when the account is already enrolled: replaces the authenticator. Ignored on a
       * fresh enrolment -- there is no current factor yet to prove.
       */
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

/**
 * /mfa/enrol/verify - Complete enrolment with a code from the authenticator app. The recovery
 * codes minted here are returned exactly once; a later call never returns them again.
 */
export declare namespace VerifyEnrolment {
  export interface Request {
    body: {
      code: string;
    };
  }

  export interface Response {
    data: {
      recoveryCodes: string[];
      /** Whether this call promoted a replacement authenticator rather than a fresh enrolment. */
      replaced: boolean;
    };
  }
}

/**
 * /mfa/recovery-codes - Replace the recovery-code set. Requires the current password and a valid
 * second factor (TOTP or an existing recovery code) -- the same re-authentication gate as
 * /mfa/disable.
 */
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

/**
 * /mfa/recovery-codes/ack - Acknowledge that the current recovery codes have been saved
 * somewhere safe. No request payload, no response body.
 */
export declare namespace AcknowledgeRecoveryCodes {
  export interface Request {
    body?: {};
  }
}

/**
 * /mfa/disable - Turn two-factor authentication off. Requires the current password and a valid
 * second factor, and evicts every *other device* for the account -- by device rather than by
 * session row, so a device whose refresh token has since rotated is fully removed rather than
 * leaving its superseded row usable. The device making this request survives, so a successful
 * disable does not also log the caller out. Falls back to evicting every device if the current
 * one cannot be identified. No response body.
 */
export declare namespace Disable {
  export interface Request {
    body: {
      password: string;
      code: string;
    };
  }
}

/**
 * POST /mfa/users/:id/unlock - Clear a lock (and its grace stamp) on another admin's account.
 * Requires `admin::users.update`. 204 on success; 404 for an unknown user; 400 when the account
 * is not locked. No grace is stamped here: the user's next session starts a fresh window.
 */
export declare namespace UnlockUser {
  export interface Params {
    id: Data.ID;
  }
}

/**
 * One browser the caller has trusted to skip the second factor (cycle 3). Never carries the
 * token or its hash: `id` is the row id, and `current` says whether this row is the browser
 * making the request (its trust cookie hashed to this row).
 */
export interface TrustedDevice {
  id: string;
  deviceName: string | null;
  /** ISO, when the trust was granted. */
  createdAt: string;
  /** ISO, the *effective* expiry: min(stored expiry, createdAt + the current `days` setting). */
  expiresAt: string;
  /** ISO, the last login this trust skipped a challenge for; null until it has. */
  lastUsedAt: string | null;
  current: boolean;
}

/**
 * GET /mfa/trusted-devices - The caller's trusted browsers, current first, then newest.
 */
export declare namespace ListTrustedDevices {
  export interface Response {
    data: TrustedDevice[];
  }
}

/**
 * DELETE /mfa/trusted-devices/:id - Revoke one of the caller's trusted browsers. 204, or 404 when
 * the row is not the caller's. Clears the trust cookie when the row was the current browser.
 * `DELETE /mfa/trusted-devices` (no `:id`) revokes every one of the caller's trusted browsers,
 * 204, and clears the cookie.
 */
export declare namespace RevokeTrustedDevice {
  export interface Params {
    id: string;
  }
}

/**
 * GET /mfa/users/:id/trusted-devices - An administrator's view of another user's trusted
 * browsers (`admin::users.read`). Same rows without `current`.
 */
export declare namespace ListUserTrustedDevices {
  export interface Params {
    id: Data.ID;
  }
  export interface Response {
    data: Array<Omit<TrustedDevice, 'current'>>;
  }
}

/**
 * DELETE /mfa/users/:id/trusted-devices - Revoke every trusted browser of another user
 * (`admin::users.update`). 204, 404 for an unknown user.
 */
export declare namespace RevokeUserTrustedDevices {
  export interface Params {
    id: Data.ID;
  }
}

/**
 * One registered passkey, as the owner's list and the registration response render it (cycle 4).
 * Exactly four fields: `publicKey`, `counter`, `credentialId` and `transports` never leave the
 * server.
 */
export interface Passkey {
  id: string;
  /** User-supplied at registration, 1..50 characters. There is no rename route. */
  name: string;
  /** ISO, shown as "Added". */
  createdAt: string;
  /** ISO, the last challenge this passkey satisfied; null until it has. */
  lastUsedAt: string | null;
}

/**
 * GET /mfa/passkeys - The caller's own passkeys, newest first. An empty list when the
 * organisation has turned passkeys off, so the list and the administrator count never disagree.
 */
export declare namespace ListPasskeys {
  export interface Response {
    data: Passkey[];
  }
}

/**
 * POST /mfa/passkeys/options - Start a registration ceremony. Costs the current password *and* a
 * live second factor (`assertPasswordAndFactor`): under this cycle's factor model the new
 * credential satisfies every future challenge on its own, so password-only would be a weaker gate
 * on a stronger operation.
 *
 * The response is the library's `PublicKeyCredentialCreationOptionsJSON`, passed through
 * verbatim for `@simplewebauthn/browser`'s `startRegistration({ optionsJSON })` to consume.
 * Typed structurally rather than imported from `@simplewebauthn/server`, which is a server-only
 * dependency: the browser half has its own identical type in `@simplewebauthn/browser`.
 */
export declare namespace PasskeyRegistrationOptions {
  export interface Request {
    body: {
      password: string;
      code: string;
    };
  }

  export interface Response {
    data: Record<string, unknown>;
  }
}

/**
 * POST /mfa/passkeys - Finish the ceremony started by the options route. No password or code: the
 * ceremony this completes was already authorised there, and it is single-use.
 */
export declare namespace RegisterPasskey {
  export interface Request {
    body: {
      /** Trimmed, 1..50 characters. */
      name: string;
      /** The browser's `RegistrationResponseJSON`, structurally typed for the same reason as above. */
      registration: Record<string, unknown>;
    };
  }

  export interface Response {
    data: Passkey;
  }
}

/**
 * DELETE /mfa/passkeys/:id - Remove one of the caller's own passkeys. 204 with no body, or 404
 * when the row is not theirs. Costs nothing: TOTP always survives a passkey deletion, so there is
 * no lockout path, and it works even while the policy is off -- removing a credential is never
 * the dangerous direction.
 */
export declare namespace DeletePasskey {
  export interface Params {
    id: string;
  }
}

/**
 * GET /mfa/users/:id/passkeys - How many passkeys another user holds (`admin::users.read`). A
 * number, not an inventory of somebody's hardware. `{ count: 0 }` when the policy is off.
 */
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

/**
 * DELETE /mfa/users/:id/passkeys - Remove every passkey of another user (`admin::users.update`,
 * the permission that already lets an administrator reset a second factor). 204, 404 for an
 * unknown user, and it works while the policy is off.
 */
export declare namespace DeleteUserPasskeys {
  export interface Params {
    id: Data.ID;
  }
}

/**
 * POST /admin/login/mfa/webauthn/options - Start an authentication ceremony against a challenge
 * minted by `/login` or `/reset-password`. Unauthenticated; the challenge token is the only
 * credential. Charges no attempt: it evaluates no factor. The response is the library's
 * `PublicKeyCredentialRequestOptionsJSON`, structurally typed as above.
 */
export declare namespace MfaWebauthnOptions {
  export interface Request {
    body: {
      challengeToken: string;
    };
  }

  export interface Response {
    data: Record<string, unknown>;
  }
}

/**
 * POST /admin/login/mfa/webauthn - Complete that ceremony and receive a session, exactly as
 * `/login/mfa` does for a code. `deviceId` and `rememberMe` are not decoration: `issueSession`
 * reads both from the request body via `extractDeviceParams`, so omitting them would lose the
 * caller's "remember me" choice and leave a trusted-device row's `deviceId` null.
 */
export declare namespace MfaWebauthnLogin {
  export interface Request {
    body: {
      challengeToken: string;
      /** The browser's `AuthenticationResponseJSON`. */
      assertion: Record<string, unknown>;
      trustDevice?: boolean;
      deviceId?: string;
      rememberMe?: boolean;
    };
  }

  export type Response = Login.Response;
}

/**
 * A single security notice: `admin::mfa-event` rows the caller has not yet seen. Never carries a
 * code, a secret or an otpauth URI -- `metadata` is limited to neutral context (see `MfaEventType`
 * in `admin::mfa`).
 */
export interface MfaEventNotice {
  id: Data.ID;
  type:
    | 'enabled'
    | 'disabled'
    | 'reset'
    | 'challenge_failed'
    | 'recovery_code_used'
    | 'grace_started'
    | 'locked'
    | 'unlocked'
    | 'authenticator_replaced'
    | 'device_trusted'
    | 'device_trust_revoked'
    | 'trusted_device_used'
    | 'passkey_registered'
    | 'passkey_removed';
  metadata: Record<string, unknown>;
  createdAt: string;
  seenAt: string | null;
}

/**
 * /mfa/notices - Security notices not yet seen by the caller.
 */
export declare namespace Notices {
  export interface Response {
    data: MfaEventNotice[];
  }
}

/**
 * /mfa/notices/seen - Mark notices seen. An absent `ids` marks every unseen notice for the
 * caller; a present one is scoped to those ids, and only ever to rows the caller owns. No
 * response body.
 */
export declare namespace MarkNoticesSeen {
  export interface Request {
    body: {
      // Narrower than `Data.ID` (which also admits strings) because the validator behind this
      // endpoint (`validateMfaNoticesSeenInput`) is `yup.number().integer()`, run strict: a
      // string id would typecheck against this field yet always 400 at runtime.
      ids?: number[];
    };
  }
}
