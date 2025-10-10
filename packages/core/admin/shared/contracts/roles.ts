import type { Data, Modules } from '@strapi/types';
import type { errors } from '@strapi/utils';
import { AdminRole, Permission, SanitizedAdminRole } from './shared';

export type SanitizedPermission = Pick<
  Permission,
  'id' | 'action' | 'actionParameters' | 'subject' | 'properties' | 'conditions'
>;

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
 * PUT /roles/:id/permissions - Update the permissions of a role
 */
export declare namespace UpdatePermissions {
  export interface Request {
    params: { id: Data.ID };
    query: {};
    body: {
      permissions: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
    };
  }

  export interface Response {
    data: SanitizedPermission[];
    error?:
      | errors.ApplicationError
      | errors.NotFoundError // One of the permissions not found
      | errors.YupValidationError;
  }
}

/**
 * GET /roles/:id - Find a role by ID
 */
export declare namespace FindRole {
  export interface Request {
    params: { id: string };
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
export declare namespace FindRoles {
  export interface Request {
    query: Modules.EntityService.Params.Pick<'admin::role', 'sort' | 'filters' | 'fields'>;
    body: {};
  }

  export interface Response {
    data: SanitizedAdminRoleWithUsersCount[];
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * POST /roles - Create a role
 */
export declare namespace Create {
  export interface Request {
    query: {};
    body: {
      name: string;
      description?: string;
    };
  }

  export interface Response {
    data: SanitizedAdminRole;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * PUT /roles/:id - Update a role
 */
export declare namespace Update {
  export interface Request {
    params: { id: string };
    query: {};
    body: {
      name?: string;
      description?: string;
    };
  }

  export interface Response {
    data: SanitizedAdminRole;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * DELETE /roles/:id - Delete a role
 */
export declare namespace Delete {
  export interface Request {
    params: { id: string };
    query: {};
    body: {};
  }

  export interface Response {
    data: Omit<AdminRole, 'users' | 'permissions'> | null;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /roles/batch-delete - Delete multiple roles
 */
export declare namespace BatchDelete {
  export interface Request {
    query: {};
    body: {
      ids: string[]; // Min length: 1
    };
  }

  export interface Response {
    data: (Omit<AdminRole, 'users' | 'permissions'> | null)[];
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
