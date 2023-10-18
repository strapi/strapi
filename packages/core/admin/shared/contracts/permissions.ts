import { Common } from '@strapi/types';
import { Permission } from './shared';

/**
 * GET /permission - List all permissions
 */
export declare namespace GetAll {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: {
      conditions: {
        id: string;
        displayName: string;
        category: string;
      };
      sections: Record<string, unknown>;
    };
    error?: Common.ApplicationError;
  }
}

/**
 * POST /permission/check - Check if the current user has the given permissions
 */
export declare namespace Check {
  export interface Request {
    query: {};
    body: {
      permissions: (Pick<Permission, 'action' | 'subject'> & { field?: string })[];
    };
  }

  export interface Response {
    data: boolean;
    error?: Common.ApplicationError | Common.YupValidationError;
  }
}
