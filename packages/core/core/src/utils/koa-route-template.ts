import type { Context } from 'koa';

/** Prefer matched route pattern over raw path (lower cardinality). */
export function resolveRouteTemplate(ctx: Context): string {
  const matched = ctx._matchedRoute;
  if (typeof matched === 'string' && matched.length > 0) {
    return matched;
  }

  if (ctx.routerPath && ctx.routerPath.length > 0) {
    return ctx.routerPath;
  }

  return ctx.path;
}
