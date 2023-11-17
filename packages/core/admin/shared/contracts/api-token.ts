import { errors } from '@strapi/utils';

import type { ApiToken } from '../../server/src/services/api-token';

type ApiTokenBody = Pick<ApiToken, 'lifespan' | 'description' | 'type' | 'name' | 'permissions'>;
type ApiTokenResponse = Omit<ApiToken, 'accessKey'>;

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
    error?: errors.ApplicationError | errors.YupValidationError;
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
    data: ApiTokenResponse[];
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
    data: ApiTokenResponse;
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
    data: ApiTokenResponse;
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
    data: ApiTokenResponse;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
