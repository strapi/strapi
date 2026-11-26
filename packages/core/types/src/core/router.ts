import type { Strapi } from './strapi';
import type { Route, RouteInput, RouteInputFor } from './route';

export type RouterType = 'admin' | 'content-api';

export interface Router {
  type: RouterType;
  prefix?: string;
  routes: Route[];
}

export interface RouterInput extends Omit<Router, 'routes'> {
  routes: RouteInput[];
}

/** A router whose string handlers must reference an action of `TControllers`. See {@link ControllerActionReference}. */
export interface RouterInputFor<TControllers, TNamespace extends string = never> extends Omit<
  Router,
  'routes'
> {
  routes: RouteInputFor<TControllers, TNamespace>[];
}

export type RouterConfig = RouterInput | ((params: { strapi: Strapi }) => RouterInput);

/**
 * A router object of a loaded API or plugin module, with strict types: the router as the module
 * declared it, or the router Strapi built when it registered the routes (`server.initRouting()`, in
 * the bootstrap phase). `type` and `prefix` may be missing until then: Strapi defaults them.
 */
export type ModuleRouterObject = {
  type?: RouterType;
  prefix?: string;
  routes: RouteInput[];
};

/**
 * A router factory of a loaded API or plugin module, with strict types, as the module declared it.
 * Strapi calls it with `{ strapi }` when it registers the routes, and keeps the router it returns
 * instead. Factories made with `createContentApiRoutesFactory` (`@strapi/utils`) also expose their
 * routes as `.routes`; other factories do not.
 */
export type ModuleRouterFactory = ((params: { strapi: Strapi }) => ModuleRouterObject) & {
  routes?: RouteInput[];
};

/**
 * A router of a loaded API or plugin module, with strict types, in any lifecycle phase. Read its
 * routes with `routesOf`, and narrow it with `isBuiltRouter` (`@strapi/utils`).
 */
export type ModuleRouter = ModuleRouterObject | ModuleRouterFactory;

/**
 * The routers of a loaded API (`strapi.api(name).routes`), keyed by router file, with strict types.
 * An API router file may also export an array of routes: that entry stays an array in every phase.
 */
export type ModuleRoutes = Record<string, ModuleRouter | RouteInput[]>;

/**
 * The routes of a loaded plugin (`strapi.plugin(name).routes`), with strict types: its routers keyed
 * by name, or the one array of routes the plugin declared, which stays an array in every phase.
 */
export type PluginRoutes = Record<string, ModuleRouter> | RouteInput[];
