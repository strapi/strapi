import EE from '@strapi/strapi/dist/utils/ee';

export const enableFeatureMiddleware = (featureName: string) => (ctx: any, next: any) => {
  if (EE.features.isEnabled(featureName)) {
    return next();
  }

  ctx.status = 404;
};

export default {
  enableFeatureMiddleware,
};
