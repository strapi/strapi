import type { Route } from './route';

export type RouterType = 'admin' | 'content-api';

export interface Router {
  type: RouterType;
  prefix?: string;
  routes: Route[];
}
