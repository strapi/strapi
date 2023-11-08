import { errors } from '@strapi/utils';

import type { SanitizedAdminUser } from './shared';
import type { Entity, EntityService } from '@strapi/types';

/**
 * /find - Find admin users
 */
export declare namespace FindAll {
  // TODO make the types for this
  export interface Request {
    query: EntityService.Params.Pick<'admin::user', 'sort' | 'filters' | 'fields'>;
    body: {};
  }

  export interface Response {
    data: {
      results: SanitizedAdminUser[];
      pagination: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
      };
    };
    error?: errors.ApplicationError;
  }
}
/**
 * /findOne - Find an admin user
 */
export declare namespace FindOne {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Entity.ID;
  }

  export interface Response {
    data: SanitizedAdminUser;
    error?: errors.ApplicationError;
  }
}
