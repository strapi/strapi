import { errors } from '@strapi/utils';

/**
 * POST /uid/generate
 */
export declare namespace GenerateUID {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /uid/check-availability
 */
export declare namespace CheckUIDAvailability {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}
