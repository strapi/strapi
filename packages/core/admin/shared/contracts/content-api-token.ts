import { errors } from '@strapi/utils';
import type { Data } from '@strapi/types';

export type ApiTokenBase = {
  accessKey?: string;
  encryptedKey?: string;
  createdAt: string;
  description: string;
  expiresAt: string;
  id: Data.ID;
  lastUsedAt: string | null;
  lifespan: string | number | null;
  name: string;
  updatedAt: string;
};

export type ContentApiApiToken = ApiTokenBase & {
  kind: 'content-api';
  type: 'custom' | 'full-access' | 'read-only';
  permissions: string[];
};

export type ContentApiApiTokenBody = Pick<ContentApiApiToken, 'name' | 'description' | 'type'> & {
  lifespan?: ContentApiApiToken['lifespan'] | null;
  permissions?: ContentApiApiToken['permissions'] | null;
};

/**
 * POST /api-tokens - Create a content-api token
 */
export declare namespace Create {
  export interface Request {
    body: ContentApiApiTokenBody;
    query: {};
  }

  export interface Response {
    data: ContentApiApiToken;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * GET /api-tokens - List content-api tokens
 */
export declare namespace List {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: ContentApiApiToken[];
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /api-tokens/:id - Delete a content-api token
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
    data: ContentApiApiToken;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /api-tokens/:id - Get a content-api token
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
    data: ContentApiApiToken;
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /api-tokens/:id - Update a content-api token
 */
export declare namespace Update {
  export interface Request {
    body: Partial<ContentApiApiTokenBody>;
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: ContentApiApiToken;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
