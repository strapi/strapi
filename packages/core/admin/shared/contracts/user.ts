import { errors } from '@strapi/utils';

import type {
  AdminUserCreationPayload,
  AdminUserUpdatePayload,
  Pagination,
  SanitizedAdminUser,
} from './shared';
import type { Data, Modules } from '@strapi/types';

/**
 * /create - Create an admin user
 */
export declare namespace Create {
  export interface Request {
    body: AdminUserCreationPayload;
    query: {};
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * /create - Create an admin user
 */
export declare namespace Create {
  export interface Request {
    body: AdminUserCreationPayload;
    query: {};
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * /find - Find admin users
 */

export declare namespace FindAll {
  // TODO make the types for this
  export interface Request {
    body: {};
    query: Modules.EntityService.Params.Pick<'admin::user', 'filters' | '_q'> & {
      [key: string]: any;
    };
  }

  export interface Response {
    data: {
      results: SanitizedAdminUser[];
      pagination: Pagination;
    };
    error?: errors.ApplicationError;
  }
}
/**
 * /findOne - Find an admin user
 */
export declare namespace FindOne {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError;
  }
}
/**
 * /update - Update an admin user
 */
export declare namespace Update {
  export interface Request {
    body: AdminUserUpdatePayload;
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * /deleteOne - Delete an admin user
 */
export declare namespace DeleteOne {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError;
  }
}

/**
 * /users/batch-delete - Delete admin users
 */
export declare namespace DeleteMany {
  export interface Request {
    body: {
      ids: Data.ID[];
    };
    query: {};
  }

  export interface Response {
    data: SanitizedAdminUser[];
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
