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
    path: '/homepage/key-statistics',
    handler: 'homepage.getKeyStatistics',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/homepage/layout',
    handler: 'homepage.getHomepageLayout',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
  {
    method: 'PUT',
    path: '/homepage/layout',
    handler: 'homepage.updateHomepageLayout',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
] satisfies Core.RouteInputFor<Controllers>[];

export default routes;
