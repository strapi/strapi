import type { Core } from '@strapi/types';
import type { Controllers } from '../../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const aiRouter: {
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
    {
      method: 'GET',
      path: '/ai-usage',
      handler: 'ai.getAiUsage',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/ai-token',
      handler: 'ai.getAiToken',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/ai-feature-config',
      handler: 'ai.getAiFeatureConfig',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
} satisfies Core.RouterInputFor<Controllers>;

export default aiRouter;
