import { Common, EntityService } from '@strapi/types';
import { AdminRole, Permission, SanitizedAdminRole, SanitizedAdminUser } from './shared';

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
    error?: Common.ApplicationError | Common.NotFoundError;
  }
}

/**
 * PUT /roles/:id/permissions - Update the permissions of a role
 */
export declare namespace UpdatePermissions {
  export interface Request {
    params: { id: string };
    query: {};
    body: {
      permissions: Permission[];
    };
  }

  export interface Response {
    data: Permission[];
    error?:
      | Common.ApplicationError
      | Common.NotFoundError // One of the permissions not found
      | Common.YupValidationError;
  }
}

/**
 * GET /roles/:id - Find a role by ID
 */
export declare namespace FindOne {
  export interface Request {
    params: { id: string };
    query: {};
    body: {};
  }

  export interface Response {
    data: SanitizedAdminRoleWithUsersCount;
    error?: Common.ApplicationError | Common.NotFoundError;
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
    error?: Common.ApplicationError | Common.ValidationError;
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
    error?: Common.ApplicationError | Common.YupValidationError;
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
    error?: Common.ApplicationError | Common.NotFoundError;
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
    error?: Common.ApplicationError;
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
    error?: Common.ApplicationError | Common.YupValidationError;
  }
}
