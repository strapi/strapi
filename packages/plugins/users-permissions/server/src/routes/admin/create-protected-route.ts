import type { Core } from '@strapi/types';

import type { AdminActionUID } from '../../bootstrap/users-permissions-actions';

/** Require a registered plugin permission while retaining default admin authentication. */
export const createProtectedRoute = (
  method: Core.RouteInput['method'],
  path: Core.RouteInput['path'],
  handler: Core.RouteInput['handler'],
  action: AdminActionUID
): Core.RouteInput => ({
  method,
  path,
  handler,
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: [`plugin::users-permissions.${action}`] },
      },
    ],
  },
});
