import type { Core } from '@strapi/types';
import { enableFeatureMiddleware } from '../../routes/utils';

const enableAIMiddleware: Core.MiddlewareHandler = (ctx, next) => {
  if (!strapi.config.get('admin.ai.enabled', true)) {
    ctx.status = 404;
    return;
  }

  return enableFeatureMiddleware('cms-ai')(ctx, next);
};

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/ai-usage',
      handler: 'ai.getAiUsage',
      config: {
        middlewares: [enableAIMiddleware],
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/ai-token',
      handler: 'ai.getAiToken',
      config: {
        middlewares: [enableAIMiddleware],
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/ai-feature-config',
      handler: 'ai.getAIFeatureConfig',
      config: {
        middlewares: [enableAIMiddleware],
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
} satisfies Core.RouterInput;
