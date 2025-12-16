import { errors } from '@strapi/utils';
import type { Data } from '@strapi/types';

export type ServiceAccountToken = {
  accessKey?: string;
  createdAt: string;
  description: string;
  expiresAt: string | null;
  id: Data.ID;
  lastUsedAt: string | null;
  lifespan: string | number | null;
  name: string;
  roles: Array<{
    id: Data.ID;
    name: string;
    code: string;
  }>;
  updatedAt: string;
};

export interface ServiceAccountTokenBody extends Pick<ServiceAccountToken, 'description' | 'name'> {
  lifespan?: ServiceAccountToken['lifespan'] | null;
  roles: Data.ID[];
}

/**
 * POST /service-accounts - Create a service account token
 */
export declare namespace Create {
  export interface Request {
    body: ServiceAccountTokenBody;
    query: {};
  }

  export interface Response {
    data: ServiceAccountToken;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * GET /service-accounts - List service account tokens
 */
export declare namespace List {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: ServiceAccountToken[];
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /service-accounts/:id - Delete a service account token
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
    data: ServiceAccountToken;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /service-accounts/:id - Get a service account token
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
    data: ServiceAccountToken;
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /service-accounts/:id - Update a service account token
 */
export declare namespace Update {
  export interface Request {
    body: Partial<ServiceAccountTokenBody>;
    query: {};
  }

  export interface Params {
    id: Data.ID;
  }

  export interface Response {
    data: ServiceAccountToken;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
