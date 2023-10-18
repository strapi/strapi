import { Common } from '@strapi/types';
import type { SanitizedAdminUser, Permission } from './shared';

/**
 * GET /users/me - Log in as an admin user
 */
export declare namespace GetMe {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: {};
    error?: Common.ApplicationError;
  }
}

/**
 * PUT /users/me - Update the current admin user
 */
export declare namespace UpdateMe {
  export interface Request {
    query: {};
    body: {
      email?: string;
      firstname?: string;
      lastname?: string;
      username?: string;
      password?: string;
      currentPassword?: string;
    };
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?:
      | Common.ApplicationError
      | Common.BadRequestError<'ValidationError', { currentPassword: ['Invalid credentials'] }>
      | Common.YupValidationError;
  }
}

/**
 * GET /users/me/permissions - Get the permissions of the current admin user
 */
export declare namespace GetOwnPermissions {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: Permission[];
    error?: Common.ApplicationError;
  }
}
