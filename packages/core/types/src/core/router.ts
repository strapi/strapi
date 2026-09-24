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
export interface RouterInputFor<TControllers, TNamespace extends string = never>
  extends Omit<Router, 'routes'> {
  routes: RouteInputFor<TControllers, TNamespace>[];
}

export type RouterConfig = RouterInput | ((params: { strapi: Strapi }) => RouterInput);
