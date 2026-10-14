import { getStrapi } from '../utils/strapi-ref';

// Route definitions stay plain objects that extensions edit in place, so the feature flag is read
// at request time.
export const enableFeatureMiddleware = (featureName: string) => (ctx: any, next: any) => {
  if (getStrapi().ee.features.isEnabled(featureName)) {
    return next();
  }

  ctx.status = 404;
};
