import { errors } from '@strapi/utils';

/**
 * /providers/isSSOLocked
 */
export declare namespace IsSSOLocked {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      isSSOLocked: boolean;
    };
    error?: errors.ApplicationError;
  }
}
