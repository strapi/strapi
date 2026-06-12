import type { AdminUser, SanitizedAdminUser } from './shared';
import type { errors } from '@strapi/utils';

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
    };
    errors?: errors.ApplicationError | errors.NotImplementedError;
  }
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
    };
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
    };
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
    };
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
