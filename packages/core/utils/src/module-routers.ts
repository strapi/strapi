/**
 * Readers for the routers of a loaded API or plugin module, e.g. `strapi.api(name).routes` or
 * `strapi.plugin(name).routes`.
 *
 * What a module holds depends on the lifecycle phase. Until Strapi registers the routes
 * (`server.initRouting()`, in the bootstrap phase, before the modules' `bootstrap`), each entry is
 * the router as the module declared it: a router object, or a factory that Strapi calls with
 * `{ strapi }`. From then on, each entry is a router object, built from the factory if needed.
 *
 * A plugin may also declare its routes as one array of routes. It stays an array in every phase, so
 * check `Array.isArray(plugin.routes)` before reading its entries as routers. Likewise, an API
 * router file may export an array of routes: that entry stays an array, and `routesOf` returns it.
 */

/**
 * A router object: it holds its routes. Either the module declared it as an object, or Strapi
 * built it from a factory when it registered the routes.
 */
export type RouterObjectLike<TRoute> = { routes: TRoute[] };

/**
 * A router factory, as a module declares it. Strapi calls it with `{ strapi }` when it registers
 * the routes. Factories made with `createContentApiRoutesFactory` also expose their routes as
 * `.routes`; other factories do not.
 */
export type RouterFactoryLike<TRoute> = ((...args: never[]) => unknown) & { routes?: TRoute[] };

/**
 * A router of a loaded API or plugin module, in any lifecycle phase: a router object, a factory,
 * or an array of routes.
 */
export type ModuleRouterLike<TRoute> =
  RouterObjectLike<TRoute> | RouterFactoryLike<TRoute> | TRoute[];

type AnyFunction = (...args: never[]) => unknown;

/**
 * Whether `router` is a router object, which holds its routes, rather than a factory that Strapi
 * has not called yet. After the routes are registered, every router of a module is a router object.
 *
 * The `true` branch keeps the router types of `TRouter` that are not functions, and the `false`
 * branch keeps its factory types, even when a factory type declares a required `routes`
 * property (as `createContentApiRoutesFactory` does). Check `Array.isArray` first for an array of
 * routes.
 */
export const isBuiltRouter = <
  TRouter extends RouterObjectLike<unknown> | RouterFactoryLike<unknown>,
>(
  router: TRouter
): router is Exclude<TRouter, AnyFunction> => typeof router !== 'function';

/**
 * The routes of a module router.
 *
 * For a factory, this is the routes it exposes as `.routes`, or none: reading them does not call
 * the factory. The routes a factory returns are known once Strapi registered the routes.
 *
 * A router file may also export an array of routes. It stays an array in every phase, and is
 * returned as is. A router object without routes has none.
 */
export const routesOf = <TRoute>(router: ModuleRouterLike<TRoute>): TRoute[] => {
  if (Array.isArray(router) === true) {
    return router;
  }

  if (isBuiltRouter(router) === true) {
    // A router file may export an object without routes, e.g. `module.exports = {}`
    return router.routes ?? [];
  }

  return router.routes ?? [];
};
