import type { Core } from '@strapi/types';

import { CHANNEL_HEADER, DEFAULT_CHANNEL_SLUG } from '../constants';
import { getService } from '../utils';

const SPACE_HEADER = 'X-Strapi-Space-Id';

/**
 * With Spaces installed, channels are per workspace and the slug lookup must be
 * workspace-scoped — but plugin bootstrap order does not guarantee that
 * resolve-space ran before us. Resolve the workspace ourselves when needed so
 * the spaces read net scopes the channel query either way.
 */
const ensureSpaceResolved = async (strapi: Core.Strapi, ctx: any): Promise<boolean> => {
  if (ctx.state.spaceId !== undefined) {
    return true;
  }
  const spaces = strapi.plugin('spaces');
  const raw = ctx.get(SPACE_HEADER);
  if (!spaces || !raw) {
    return true;
  }
  const space = await (spaces.service('spaces') as any).resolveHeaderValue(raw);
  if (!space || space.status !== 'active') {
    ctx.badRequest(`Unknown or inactive space: "${raw}"`);
    return false;
  }
  ctx.state.spaceId = space.id;
  ctx.state.spaceSlug = space.slug;
  return true;
};

/**
 * Koa middleware resolving `X-Strapi-Channel` (a channel slug; numeric id as a
 * fallback; `default` or absent = base content) into `ctx.state.channel`
 * (`{ id, slug }`), plus `ctx.state.channelId` / `ctx.state.channelSlug`.
 * Unknown or archived → 400: silently falling back to the base would serve
 * the wrong content to a caller who asked for a channel.
 */
export const createResolveChannelMiddleware = (strapi: Core.Strapi) => {
  return async (ctx: any, next: () => Promise<any>) => {
    const raw = ctx.get(CHANNEL_HEADER);
    if (!raw || raw === DEFAULT_CHANNEL_SLUG) {
      return next();
    }

    if (!(await ensureSpaceResolved(strapi, ctx))) {
      return undefined;
    }

    const channels = getService('channels');
    const channel = await channels.resolveHeaderValue(raw, ctx.state.spaceId ?? null);

    if (!channel || channel.archived) {
      return ctx.badRequest(`Unknown or archived channel: "${raw}"`);
    }

    ctx.state.channel = { id: channel.id, slug: channel.slug };
    ctx.state.channelId = channel.id;
    ctx.state.channelSlug = channel.slug;

    return next();
  };
};

/**
 * Plugin middleware factory (`plugin::channels.resolve-channel`) for explicit
 * route-level use. The global registration happens in `bootstrap.ts`.
 */
const resolveChannel = (_config: unknown, { strapi }: { strapi: Core.Strapi }) =>
  createResolveChannelMiddleware(strapi);

export default resolveChannel;
