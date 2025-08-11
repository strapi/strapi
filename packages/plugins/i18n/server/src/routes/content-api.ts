import type { Core } from '@strapi/types';
import { I18nLocaleRouteValidator } from './validation';

let sharedRoutes: Core.RouterInput['routes'] | undefined;

const ensureSharedRoutes = (): Core.RouterInput['routes'] => {
  if (!sharedRoutes) {
    const validator = new I18nLocaleRouteValidator(strapi);
    sharedRoutes = [
      {
        method: 'GET',
        path: '/locales',
        handler: 'locales.listLocales',
        response: validator.locales,
      },
    ];
  }

  return sharedRoutes;
};

const createContentApiRoutes = (): Core.RouterInput => {
  return {
    type: 'content-api',
    routes: ensureSharedRoutes(),
  };
};

Object.defineProperty(createContentApiRoutes, 'routes', {
  get: ensureSharedRoutes,
  set(next: Core.RouterInput['routes']) {
    sharedRoutes = next;
  },
});

export default createContentApiRoutes;
