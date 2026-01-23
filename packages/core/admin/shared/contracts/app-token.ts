import { errors } from '@strapi/utils';
import type { Data } from '@strapi/types';
import type { Permission } from './shared';

export type AppToken = {
  id: Data.ID;
  name: string;
  description: string;
  type: 'inherit' | 'custom';
  accessKey?: string;
  lastUsedAt: string | null;
  expiresAt: number | null;
  lifespan: number | null;
  permissions?: Permission[];
  user: {
    id: Data.ID;
  };
  createdAt: string;
  updatedAt: string;
};

export type AppTokenBody = {
  name: string;
  description?: string;
  permissions?: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
  lifespan?: number | null;
};

/**
 * POST /users/me/app-tokens - Create an app token
 */
export declare namespace Create {
  export interface Request {
    body: AppTokenBody;
    query: {};
  }

  export interface Response {
    data: AppToken;
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * GET /users/me/app-tokens - List app tokens
 */
export declare namespace List {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: AppToken[];
    error?: errors.ApplicationError;
  }
}

/**
 * GET /users/me/app-tokens/:id - Get an app token
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
    data: AppToken;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * PUT /users/me/app-tokens/:id - Update an app token
 */
export declare namespace Update {
  export interface Request {
    body: AppTokenBody;
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: AppToken;
    error?: errors.ApplicationError | errors.NotFoundError | errors.ValidationError;
  }
}

/**
 * DELETE /users/me/app-tokens/:id - Delete an app token
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
    data: AppToken;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /users/me/app-tokens/:id/regenerate - Regenerate an app token
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
    data: AppToken;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * GET /users/me/app-tokens/:id/permissions - Get app token permissions
 */
export declare namespace GetPermissions {
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

/**
 * PUT /users/me/app-tokens/:id/permissions - Update app token permissions
 */
export declare namespace UpdatePermissions {
  export interface Request {
    params: { id: Data.ID };
    query: {};
    body: {
      permissions: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
    };
  }

  export interface Response {
    data: Permission[];
    error?: errors.ApplicationError | errors.NotFoundError | errors.ValidationError;
  }
}
