import type { errors } from '@strapi/utils';
import type { AdminUser, SanitizedAdminUser } from './shared';

/**
 * /login - Log in as an admin user
 */
export declare namespace Login {
  export interface Request {
    query: {
      user: Pick<AdminUser, 'email' | 'password'>;
    };
    body: Pick<AdminUser, 'email' | 'password'> & {
      deviceId?: string;
      rememberMe?: boolean;
    };
  }

  export interface Response {
    data: {
      // Primary token for the client to use. This is the short‑lived access token.
      token: string;
      accessToken?: string;
      user: Omit<SanitizedAdminUser, 'permissions'>;
    } & MfaEnrolmentRequiredFields;
    errors?: errors.ApplicationError | errors.NotImplementedError;
  }
}

/**
 * The response `/login` sends instead of `Login.Response` when the account has two-factor
 * authentication enrolled: no session is created yet, so there is deliberately no cookie and no
 * access token here. `challengeToken` authorises exactly one follow-up call, `/login/mfa`.
 */
export interface MfaChallengeResponse {
  data: {
    mfaRequired: true;
    challengeToken: string;
    expiresIn: number;
    /**
     * The trust period the challenge screen may offer ("Trust this device for {n}
     * days"), or null when the organisation does not offer trusted devices. Never absent.
     */
    trustedDeviceDays: number | null;
    /**
     * Whether the challenge screen may offer "Use a passkey" -- the organisation allows
     * passkeys *and* this account holds at least one. Never absent. Telling a caller who already
     * proved the password that this account has passkeys is not a new disclosure: the challenge
     * itself already reveals that the account is enrolled.
     */
    passkeyAvailable: boolean;
  };
}

/**
 * Present on a session-issuing response (login, register, register-admin, reset-password) only
 * when the account is required to enrol in two-factor authentication and has not yet: the session
 * is real, and `mfaGraceUntil` (ISO) is when the account will be locked if it stays unenrolled.
 */
export interface MfaEnrolmentRequiredFields {
  mfaEnrolmentRequired?: true;
  mfaGraceUntil?: string;
}

/**
 * /login/mfa - Complete a login started by `/login` when `Login.Response` came back as
 * `MfaChallengeResponse`. Accepts either a TOTP code or a recovery code; on success it issues a
 * session exactly like `/login` does for an unenrolled account.
 */
export declare namespace LoginMfa {
  export interface Request {
    body: {
      challengeToken: string;
      code: string;
      deviceId?: string;
      rememberMe?: boolean;
      /** Trust this browser after the code verifies. Ignored when the organisation disallows it. */
      trustDevice?: boolean;
    };
  }

  export type Response = Login.Response;
}

/**
 * /access-token - Exchange a refresh cookie for an access token
 */
export declare namespace AccessTokenExchange {
  export interface Request {
    body?: {};
  }

  export interface Response {
    data: {
      token: string;
    };
    errors?: errors.ApplicationError | errors.UnauthorizedError;
  }
}

/**
 * /registration-info - Get the info via a registration token
 */
export declare namespace RegistrationInfo {
  export interface Request {
    query: {
      registrationToken: string;
    };
  }

  export interface Response {
    data: {
      email?: string;
      firstname?: string;
      lastname?: string;
    };
    errors?: errors.ApplicationError | errors.ValidationError<'Invalid registrationToken'>;
  }
}

/**
 * /register - Register an admin user
 */
export declare namespace Register {
  export interface Request {
    body: {
      registrationToken: string;
      userInfo: Pick<AdminUser, 'firstname' | 'lastname' | 'email' | 'password'>;
      deviceId?: string;
      rememberMe?: boolean;
    };
  }

  export interface Response {
    data: {
      token: string;
      accessToken?: string;
      user: Omit<SanitizedAdminUser, 'permissions'>;
    } & MfaEnrolmentRequiredFields;
    errors?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * /register-admin - Register an admin user
 */
export declare namespace RegisterAdmin {
  export interface Request {
    body: Pick<AdminUser, 'email' | 'firstname' | 'lastname' | 'password'> & {
      deviceId?: string;
      rememberMe?: boolean;
    };
  }

  export interface Response {
    data: {
      token: string;
      accessToken?: string;
      user: Omit<SanitizedAdminUser, 'permissions'>;
    } & MfaEnrolmentRequiredFields;
    errors?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * /forgot-password - Send a password reset email
 */
export declare namespace ForgotPassword {
  export interface Request {
    body: {
      email: string;
    };
  }
  export interface Response {}
}

/**
 * /reset-password - Reset a password
 */
export declare namespace ResetPassword {
  export interface Request {
    body: {
      resetPasswordToken: string;
      password: string;
    };
  }
  export interface Response {
    data: {
      token: string;
      user: Omit<SanitizedAdminUser, 'permissions'>;
    } & MfaEnrolmentRequiredFields;
  }
}

/**
 * /logout - Log out an admin user
 */
export declare namespace Logout {
  export interface Request {
    query: {};
    body: {
      deviceId?: string;
    };
  }
  export interface Response {
    data: {};
  }
}
