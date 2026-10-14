import type { Core } from '@strapi/types';

/**
 * Plugin-scoped `strapi` instance for modules that stay plain objects so user extensions can patch
 * them in place (controllers, route middlewares, the `workflow-metrics` service). They read it at
 * call time with `getStrapi()`. It is bound whenever core hands `{ strapi }` to something the plugin
 * owns before requests are served: `register`, `bootstrap` and every service factory.
 */
let boundStrapi: Core.Strapi | undefined;

export const bindStrapi = (strapi: Core.Strapi) => {
  boundStrapi = strapi;
};

export const getStrapi = (): Core.Strapi => {
  if (boundStrapi !== undefined) {
    return boundStrapi;
  }

  // TODO @Nico Falls back to the global `strapi` for code paths that run before any bind (e.g. a
  // user extension replacing `register`, `bootstrap` and the service factories), which keeps develop
  // behaviour. The binding is module-level: with several Strapi instances in one process, the last
  // bound wins.
  return strapi;
};

/**
 * Test-only: forget the bound instance so `getStrapi()` falls back to the global again.
 */
export const resetStrapiBinding = () => {
  boundStrapi = undefined;
};

type Factory = (params: { strapi: Core.Strapi }) => unknown;

/**
 * Wraps each factory of the map so it binds the instance core instantiates it with. Plain objects
 * are kept as is, so extensions can still patch them in place.
 */
export const bindOnInstantiate = <T extends Record<string, unknown>>(map: T): T => {
  return Object.fromEntries(
    Object.entries(map).map(([name, value]) => {
      if (typeof value !== 'function') {
        return [name, value];
      }

      const factory = value as Factory;
      return [
        name,
        (params: { strapi: Core.Strapi }) => {
          bindStrapi(params.strapi);
          return factory(params);
        },
      ];
    })
  ) as T;
};
