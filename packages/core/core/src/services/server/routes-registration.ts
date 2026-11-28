import type { Core } from '@strapi/types';

/**
 * The Strapi apps whose routes are registered: `server.initRouting()` completed. From then on, the
 * routers of every module are built and their routes carry `info`.
 *
 * `strapi.isLoaded` cannot tell: it stays `false` through the whole bootstrap phase, while the
 * routes are registered before the modules' `bootstrap`.
 */
const appsWithRegisteredRoutes = new WeakSet<Core.Strapi>();

export const markRoutesRegistered = (strapi: Core.Strapi): void => {
  appsWithRegisteredRoutes.add(strapi);
};

export const areRoutesRegistered = (strapi: Core.Strapi): boolean =>
  appsWithRegisteredRoutes.has(strapi);
