import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const routes: {
  method: string;
  path: string;
  handler: string;
  config: {
    policies: string[];
  };
}[] = [
  {
    method: 'GET',
    path: '/permissions',
    handler: 'permission.getAll',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'POST',
    path: '/permissions/check',
    handler: 'permission.check',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
] satisfies Core.RouteInputFor<Controllers>[];

export default routes;
