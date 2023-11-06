import { errors } from '@strapi/utils';
import { ValidationError as YupValidationError } from 'yup';
import { Entity } from '@strapi/types';

type ApiToken = {
  accessKey: string;
  createdAt: string;
  description: string;
  expiresAt: string;
  id: Entity.ID;
  lastUsedAt: string | null;
  lifespan: string;
  name: string;
  permissions: any[];
  type: 'custom' | 'full-access' | 'read-only';
  updatedAt: string;
};

interface ApiTokenBody extends Pick<ApiToken,'description' | 'type' | 'name'> {
  lifespan?: ApiToken['lifespan'] | number | null;
  permissions?: ApiToken['permissions'] | null;
}

/**
 * POST /api-tokens - Create an api token
 */
export declare namespace Create {
  export interface Request {
    body: ApiTokenBody;
    query: {};
  }

  export interface Response {
    data: ApiToken;
    error?: errors.ApplicationError | YupValidationError;
  }
}

/**
 * GET /api-tokens - List api tokens
 */
export declare namespace List {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: ApiToken[];
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /api-tokens/:id - Delete an API token
 */
export declare namespace Revoke {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: number;
  }

  export interface Response {
    data: ApiToken;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /api-tokens/:id - Get an API token
 */
export declare namespace Get {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: number;
  }

  export interface Response {
    data: ApiToken;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /api-tokens/:id - Update an API token
 */
export declare namespace Update {
  export interface Request {
    body: ApiTokenBody;
    query: {};
  }

  export interface Params {
    id: number;
  }

  export interface Response {
    data: ApiToken;
    error?: errors.ApplicationError | YupValidationError;
  }
}
