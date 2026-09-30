import type { Core, Modules } from '@strapi/types';

export const enableFeatureMiddleware =
  (featureName: Modules.EE.FeatureName): Core.MiddlewareHandler =>
  (ctx, next) => {
    if (strapi.ee.features.isEnabled(featureName)) {
      return next();
    }

    ctx.status = 404;
  };
