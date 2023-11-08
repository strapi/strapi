import { errors } from '@strapi/utils';
import { Entity, Pagination, SanitizedAdminUser } from './shared';

interface AuditLog extends Pick<Entity, 'id'> {
  date: string;
  action: string;
  /**
   * TODO: could this be better typed – working on the server-side code could indicate this.
   * However, we know it's JSON.
   */
  payload: Record<string, unknown>;
  user?: SanitizedAdminUser;
}

namespace GetAll {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: {
      pagination: Pagination;
      results: AuditLog[];
    };
    error?: errors.ApplicationError;
  }
}

namespace Get {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Entity['id'];
  }

  export type Response =
    | AuditLog
    | {
        error?: errors.ApplicationError;
      };
}

export { AuditLog, GetAll, Get };
