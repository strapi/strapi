import { Location } from 'react-router-dom';

import type { Permission, User } from '../../features/Auth';

interface RBACContext extends Pick<Location, 'pathname' | 'search'> {
  /**
   * The current user.
   */
  user?: User;
  /**
   * The permissions of the current user.
   */
  permissions: Permission[];
}

interface RBACMiddleware {
  (
    ctx: RBACContext
  ): (
    next: (permissions: Permission[]) => Promise<Permission[]> | Permission[]
  ) => (permissions: Permission[]) => Promise<Permission[]> | Permission[];
}

class RBAC {
  private middlewares: RBACMiddleware[] = [];

  constructor() {}

  use(middleware: RBACMiddleware[]): void;
  use(middleware: RBACMiddleware): void;
  use(middleware: RBACMiddleware | RBACMiddleware[]): void {
    if (Array.isArray(middleware)) {
      this.middlewares.push(...middleware);
    } else {
      this.middlewares.push(middleware);
    }
  }

  run = async (ctx: RBACContext, permissions: Permission[]): Promise<Permission[]> => {
    let index = 0;

    const middlewaresToRun = this.middlewares.map((middleware) => middleware(ctx));

    const next = async (permissions: Permission[]) => {
      if (index < this.middlewares.length) {
        return middlewaresToRun[index++](next)(permissions);
      }

      return permissions;
    };

    return next(permissions);
  };
}

export { RBAC };
export type { RBACMiddleware, RBACContext };
