import type { Core } from '@strapi/types';

export const enableFeatureMiddleware: Core.MiddlewareFactory =
  (featureName: string) => (ctx, next) => {
    if (strapi.ee.features.isEnabled(featureName)) {
      return next();
    }

    ctx.status = 404;
  };

export default {
  enableFeatureMiddleware,
};
