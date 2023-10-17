import type { AdminUser, SanitizedAdminUser } from './shared';

/**
 * /login - Log in as an admin user
 */
export declare namespace Login {
  export interface Request {
    query: {
      user: Pick<AdminUser, 'email' | 'password'>;
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
 * /renew-token - Renew an admin user's token
 */
export declare namespace RenewToken {
  export interface Request {
    body: {
      token: string;
    };
  }

  export interface Response {
    data: {
      token: string;
    };
  }
}

/**
 * /register-admin - Register an admin user
 */
export declare namespace RegistrationInfo {
  export interface Request {
    query: {
      registrationToken: string;
    };
  }

  export interface Response {
    data: {
      email: string;
      firstname?: string;
      lastname?: string;
    };
  }
}

/**
 * /register - Register an admin user
 */
export declare namespace Register {
  export interface Request {
    body: {
      registrationToken: string;
      userInfo: Pick<AdminUser, 'firstname' | 'lastname' | 'password'>;
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
    query: {
      token: string;
    };
  }
  export interface Response {
    data: {};
  }
}
