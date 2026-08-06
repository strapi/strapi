import type { Core } from '@strapi/types';

/**
 * Signature of a single route factory (`get`, `post`, …).
 *
 * The handler may be an inline function: `returnBodyMiddleware` sets `ctx.body`
 * from the return value when it is unset (see
 * `services/server/compose-endpoint.ts`), so
 * `post('/echo', (ctx) => ({ ... }))` works as-is.
 */
export type RouteFn = (
  path: string,
  handler: Core.MiddlewareHandler,
  config?: Core.RouteConfig
) => Core.RouteInput;

export interface RouteVerbs {
  get: RouteFn;
  post: RouteFn;
  put: RouteFn;
  patch: RouteFn;
  /** `delete` is a reserved word and cannot be a destructured binding (ADR-0012). */
  del: RouteFn;
}

/**
 * A route builder receives the verb helpers and returns a list of route inputs.
 */
export type RouteBuilder = (verbs: RouteVerbs) => Core.RouteInput[];

const makeVerb =
  (method: Core.HTTPMethod): RouteFn =>
  (path, handler, config) => {
    if (typeof path !== 'string' || path.length === 0) {
      throw new TypeError(`Route path must be a non-empty string (got ${typeof path})`);
    }

    if (typeof handler !== 'function') {
      throw new TypeError(`Route handler for "${method} ${path}" must be a function`);
    }

    const route: Core.RouteInput = { method, path, handler };

    if (config !== undefined) {
      route.config = config;
    }

    return route;
  };

/**
 * The verb helpers passed to a {@link RouteBuilder}.
 */
export const routeVerbs: RouteVerbs = {
  get: makeVerb('GET'),
  post: makeVerb('POST'),
  put: makeVerb('PUT'),
  patch: makeVerb('PATCH'),
  del: makeVerb('DELETE'),
};

/**
 * Normalize a routes definition (builder function or explicit route inputs)
 * into a flat list of `Core.RouteInput`.
 */
export const resolveRoutes = (routes: RouteBuilder | Core.RouteInput[]): Core.RouteInput[] => {
  if (typeof routes === 'function') {
    const result = routes(routeVerbs);

    if (!Array.isArray(result)) {
      throw new TypeError('A routes builder must return an array of routes');
    }

    return result;
  }

  if (Array.isArray(routes)) {
    return routes;
  }

  throw new TypeError('routes must be a builder function or an array of route inputs');
};
