import { errors } from '@strapi/utils';

/**
 * GET /content-types
 */
export declare namespace FindContentTypes {
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
 * GET /content-types-settings
 */
export declare namespace FindContentTypesSettings {
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
 * GET /content-types/:uid/configuration
 */
export declare namespace FindContentTypeConfiguration {
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
 * PUT /content-types/:uid/configuration
 */
export declare namespace UpdateContentTypeConfiguration {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}
