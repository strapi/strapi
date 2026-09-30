import type { Modules } from '@strapi/types';

export const enableFeatureMiddleware =
  (featureName: Modules.EE.FeatureName) => (ctx: any, next: any) => {
    if (strapi.ee.features.isEnabled(featureName)) {
      return next();
    }

    ctx.status = 404;
  };
