import { errors } from '@strapi/utils';
import { ValidationError as YupValidationError } from 'yup';

import type { SanitizedAdminUser, AdminUserCreationPayload } from './shared';
import { Entity } from '@strapi/types';

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
    error?: errors.ApplicationError | YupValidationError;
  }
}

/**
 * /find - Find admin users
 */
// TODO: Rename to FindAll
export declare namespace Find {
  // TODO make the types for this
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: {
      results: SanitizedAdminUser[];
      pagination: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
      };
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
    id: Entity.ID;
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
    body: AdminUserCreationPayload;
    query: {};
  }

  export interface Params {
    id: Entity.ID;
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError | YupValidationError;
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
    id: Entity.ID;
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError;
  }
}

/**
 * /deleteMany - Delete admin users
 */
export declare namespace DeleteMany {
  export interface Request {
    body: {
      ids: Entity.ID[];
    };
    query: {};
  }

  export interface Response {
    data: SanitizedAdminUser[];
    error?: errors.ApplicationError | YupValidationError;
  }
}
