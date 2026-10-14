// TODO @Nico Route definitions stay plain objects and this middleware reads the global `strapi`:
// user extensions edit `plugin.routes[...]` on the raw plugin object before core resolves router
// factories, so a factory would break them (see __tests__/plugin-shape.vitest.test.ts).
export const enableFeatureMiddleware = (featureName: string) => (ctx: any, next: any) => {
  if (strapi.ee.features.isEnabled(featureName)) {
    return next();
  }

  ctx.status = 404;
};
