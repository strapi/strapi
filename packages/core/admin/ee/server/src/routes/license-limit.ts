import type { Core } from '@strapi/types';
import type { RouteControllers } from '../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const licenseLimitRouter: {
  type: string;
  routes: {
    method: string;
    path: string;
    handler: string;
    config: {
      policies: string[];
    };
  }[];
} = {
  type: 'admin',
  routes: [
    // License limit infos
    {
      method: 'GET',
      path: '/license-limit-information',
      handler: 'admin.licenseLimitInformation',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
} satisfies Core.RouterInputFor<RouteControllers>;

export default licenseLimitRouter;
