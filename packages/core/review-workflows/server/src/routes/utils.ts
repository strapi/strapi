export const enableFeatureMiddleware = (featureName: string) => (ctx: any, next: any) => {
  if (strapi.ee.features.isEnabled(featureName)) {
    return next();
  }

  ctx.status = 404;
};
