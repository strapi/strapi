import { Common } from '@strapi/types';

/**
 * GET /content-api/permissions - Get the permissions of all content types
 */
export declare namespace GetPermissions {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: Record<string, { controllers: Record<string, string[]> }>;
    error?: Common.ApplicationError;
  }
}

/**
 * GET /content-api/routes - Get the routes of all content types
 */
export declare namespace GetRoutes {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: Record<string, Common.Route[]>;
    error?: Common.ApplicationError;
  }
}
