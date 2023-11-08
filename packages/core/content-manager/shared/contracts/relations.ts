import { errors } from '@strapi/utils';

/**
 * GET /relations/:model/:targetField
 */
export declare namespace FindAvailable {
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
 * GET /relations/:model/:id/:targetField
 */
export declare namespace FindExisting {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}
