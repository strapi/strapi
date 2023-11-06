import EE from '@strapi/strapi/dist/utils/ee';
import { Common } from '@strapi/types';

export const enableFeatureMiddleware: Common.MiddlewareFactory =
  (featureName: string) => (ctx, next) => {
    if (EE.features.isEnabled(featureName)) {
      return next();
    }

    ctx.status = 404;
  };

export default {
  enableFeatureMiddleware,
};
