import type { Core } from '@strapi/types';

import { getService } from '../utils';

const SPACE_HEADER = 'X-Strapi-Space-Id';

/**
 * Koa middleware that resolves the caller's active space from the
 * `X-Strapi-Space-Id` header (the space **slug** — e.g. `default`, `acme`; a numeric
 * id is accepted as a fallback) and exposes it on the request state:
 *
 *   - `ctx.state.spaceId`   — numeric PK, consumed by the document-service
 *     multitenancy middleware and the DB lifecycle subscriber.
 *   - `ctx.state.spaceSlug` — slug, consumed by the settings-visibility read/write
 *     wrappers and the per-space default-locale strategy.
 *
 * Resolution goes through the spaces service's TTL cache (see
 * `services/spaces.ts`), so steady-state requests don't touch the DB.
 *
 * Requests without the header pass through untouched — that's the "platform view"
 * (no tenant filter applied). An unknown or archived space is a 400: silently
 * ignoring it would leak platform-wide data to a caller that asked for isolation.
 */
export const createResolveSpaceMiddleware = (strapi: Core.Strapi) => {
  return async (ctx: any, next: () => Promise<any>) => {
    const raw = ctx.get(SPACE_HEADER);
    if (!raw) {
      return next();
    }

    const space = await getService('spaces').resolveHeaderValue(raw);

    if (!space || space.status !== 'active') {
      return ctx.badRequest(`Unknown or inactive space: "${raw}"`);
    }

    ctx.state.spaceId = space.id;
    ctx.state.spaceSlug = space.slug;

    return next();
  };
};

/**
 * Plugin middleware factory (`plugin::spaces.resolve-space`) so route configs can
 * reference the middleware explicitly. The global registration happens in
 * `bootstrap.ts` via `strapi.server.use` — this export exists for route-level use.
 */
const resolveSpace = (_config: unknown, { strapi }: { strapi: Core.Strapi }) =>
  createResolveSpaceMiddleware(strapi);

export default resolveSpace;
