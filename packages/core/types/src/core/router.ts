import type { Strapi } from './strapi';
import type { Route, RouteInput } from './route';

export type RouterType = 'admin' | 'content-api';

export interface Router {
  type: RouterType;
  prefix?: string;
  routes: Route[];
}

export interface RouterInput extends Omit<Router, 'routes'> {
  routes: RouteInput[];
}

export type RouterConfig = RouterInput | ((params: { strapi: Strapi }) => RouterInput);
