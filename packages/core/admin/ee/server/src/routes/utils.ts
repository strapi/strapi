import '@strapi/types';

export const enableFeatureMiddleware = (featureName: string) => (ctx: any, next: any) => {
  if (strapi.EE.features.isEnabled(featureName)) {
    return next();
  }

  ctx.status = 404;
};

export default {
  enableFeatureMiddleware,
};
