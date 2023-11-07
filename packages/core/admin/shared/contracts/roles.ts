import type { Entity, EntityService } from '@strapi/types';
import type { errors } from '@strapi/utils';
import { Permission, SanitizedAdminRole } from './shared';

type SanitizedAdminRoleWithUsersCount = SanitizedAdminRole & { usersCount?: number };

/**
 * GET /roles/:id/permissions - Get the permissions of a role
 */
export declare namespace GetPermissions {
  export interface Request {
    params: { id: string };
    query: {};
    body: {};
  }

  export interface Response {
    data: Permission[];
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * GET /roles/:id - Find a role by ID
 */
export declare namespace FindOne {
  export interface Request {
    params: { id: Entity.ID };
    query: {};
    body: {};
  }

  export interface Response {
    data: SanitizedAdminRoleWithUsersCount;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * GET /roles
 */
export declare namespace FindAll {
  export interface Request {
    query: EntityService.Params.Pick<'admin::role', 'sort' | 'filters' | 'fields'>;
    body: {};
  }

  export interface Response {
    data: SanitizedAdminRoleWithUsersCount[];
    error?: errors.ApplicationError | errors.ValidationError;
  }
}
