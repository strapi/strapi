import type { Data } from '@strapi/types';
import type { AdminUser } from './shared';

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
 * second factor, and evicts every other admin session for the account. No response body.
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
 * A single security notice: `admin::mfa-event` rows the caller has not yet seen. Never carries a
 * code, a secret or an otpauth URI -- `metadata` is limited to neutral context (see `MfaEventType`
 * in `admin::mfa`).
 */
export interface MfaEventNotice {
  id: Data.ID;
  type: 'enabled' | 'disabled' | 'reset' | 'challenge_failed' | 'recovery_code_used';
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
      ids?: Data.ID[];
    };
  }
}
