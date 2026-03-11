import { errors } from '@strapi/utils';
import type { Data } from '@strapi/types';
import type { Permission, AdminUser } from './shared';
import type { ApiTokenBase } from './content-api-token';

export type AdminApiToken = ApiTokenBase & {
  kind: 'admin';
  adminPermissions: Permission[];
  adminUserOwner: Data.ID | AdminUser;
};

export type AdminTokenBody = Pick<AdminApiToken, 'name' | 'description'> & {
  lifespan?: AdminApiToken['lifespan'];
  adminPermissions?: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
  adminUserOwner?: Data.ID;
};

/**
 * POST /admin-tokens - Create an admin token
 */
export declare namespace Create {
  export interface Request {
    body: Pick<AdminApiToken, 'name' | 'description' | 'lifespan'> & {
      adminPermissions?: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
    };
    query: {};
  }

  export interface Response {
    data: AdminApiToken;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * GET /admin-tokens - List admin tokens
 */
export declare namespace List {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: AdminApiToken[];
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /admin-tokens/:id - Revoke an admin token
 */
export declare namespace Revoke {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: AdminApiToken;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /admin-tokens/:id - Get an admin token
 */
export declare namespace Get {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: AdminApiToken;
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /admin-tokens/:id - Update an admin token
 */
export declare namespace Update {
  export interface Request {
    body: Partial<AdminTokenBody>;
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: AdminApiToken;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * POST /admin-tokens/:id/regenerate - Regenerate an admin token
 */
export declare namespace Regenerate {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: AdminApiToken;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /admin-tokens/:id/owner-permissions - Get the effective permissions of the token owner
 */
export declare namespace GetOwnerPermissions {
  export interface Request {
    params: { id: Data.ID };
    query: {};
    body: {};
  }

  export interface Response {
    data: Permission[];
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}
