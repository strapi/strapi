import type { MiddlewareHandler } from './middleware';

export type RouterType = 'admin' | 'content-api';

export type RouteInfo = {
  apiName?: string;
  pluginName?: string;
  type?: string;
};

export type RouteConfig = {
  prefix?: string;
  middlewares?: Array<string | MiddlewareHandler>;
  policies?: Array<string | { name: string; config: unknown }>;
  auth?: false | { scope?: string[]; strategies?: string[] };
};

export type Route = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL' | 'OPTIONS' | 'HEAD';
  path: string;
  handler: string | MiddlewareHandler | MiddlewareHandler[];
  info: RouteInfo;
  config?: RouteConfig;
};

export type RouteInput = Omit<Route, 'info'> & { info?: Partial<RouteInfo> };

export type Router = {
  type: RouterType;
  prefix?: string;
  routes: Route[];
};
