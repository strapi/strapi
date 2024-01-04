import { Common } from '@strapi/types';

export const enableFeatureMiddleware: Common.MiddlewareFactory =
  (featureName: string) => (ctx, next) => {
    if (strapi.ee.features.isEnabled(featureName)) {
      return next();
    }

    ctx.status = 404;
  };

export default {
  enableFeatureMiddleware,
};
