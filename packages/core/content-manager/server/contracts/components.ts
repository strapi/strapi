import { errors } from '@strapi/utils';

/**
 * GET /components
 */
export declare namespace FindComponents {
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
 * GET /components/:uid/configuration
 */
export declare namespace FindComponentConfiguration {
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
 * PUT /components/:uid/configuration
 */
export declare namespace UpdateComponentConfiguration {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}
