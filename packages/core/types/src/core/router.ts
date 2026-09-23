import type { Strapi } from './strapi';
import type { PluginRouteInput, Route, RouteInput } from './route';

export type RouterType = 'admin' | 'content-api';

export interface Router {
  type: RouterType;
  prefix?: string;
  routes: Route[];
}

export interface RouterInput extends Omit<Router, 'routes'> {
  routes: RouteInput[];
}

/** A router of a plugin whose string handlers are checked against the plugin's registered controllers. */
export interface PluginRouterInput<TPlugin extends string> extends Omit<Router, 'routes'> {
  routes: PluginRouteInput<TPlugin>[];
}

export type RouterConfig = RouterInput | ((params: { strapi: Strapi }) => RouterInput);
