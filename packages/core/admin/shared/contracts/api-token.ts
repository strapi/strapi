import { errors } from '@strapi/utils';
import { ValidationError as YupValidationError } from 'yup';

export type ApiTokenPermission = {
  id: number | `${number}`;
  action: string;
  token: ApiToken | number;
};

export type ApiToken = {
  id?: number | `${number}`;
  name: string;
  description: string;
  accessKey: string;
  lastUsedAt: number;
  lifespan: number | null;
  expiresAt: number;
  type: 'read-only' | 'full-access' | 'custom';
  permissions: (number | ApiTokenPermission)[];
};

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
    errors?: errors.ApplicationError | YupValidationError;
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
    errors?: errors.ApplicationError;
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
    errors?: errors.ApplicationError;
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
    errors?: errors.ApplicationError;
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
    errors?: errors.ApplicationError | YupValidationError;
  }
}
