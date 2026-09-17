import type { Core } from '@strapi/types';

import { BRANCH_HEADER, MAIN_SLUG } from '../constants';
import { getService } from '../utils';

const SPACE_HEADER = 'X-Strapi-Space-Id';

/**
 * With Spaces installed, branches are per workspace and the slug lookup must be
 * workspace-scoped — but plugin bootstrap order does not guarantee that
 * resolve-space ran before us. Resolve the workspace ourselves when needed so
 * the spaces read net scopes the branch query either way.
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
 * Koa middleware resolving `X-Strapi-Branch` (a branch slug; numeric id as a
 * fallback; `main` or absent = trunk) into `ctx.state.branch`
 * (`{ id, slug, parentId, chain }`), plus `ctx.state.branchId` /
 * `ctx.state.branchSlug`. Unknown, merged or archived → 400: silently falling
 * back to main would show production data to a caller who asked for a branch.
 */
export const createResolveBranchMiddleware = (strapi: Core.Strapi) => {
  return async (ctx: any, next: () => Promise<any>) => {
    const raw = ctx.get(BRANCH_HEADER);
    if (!raw || raw === MAIN_SLUG) {
      return next();
    }

    if (!(await ensureSpaceResolved(strapi, ctx))) {
      return undefined;
    }

    const branches = getService('branches');
    const branch = await branches.resolveHeaderValue(raw, ctx.state.spaceId ?? null);

    if (!branch || branch.status !== 'active') {
      return ctx.badRequest(`Unknown or inactive branch: "${raw}"`);
    }

    ctx.state.branch = {
      id: branch.id,
      slug: branch.slug,
      parentId: branch.parent?.id ?? null,
      chain: await branches.getChain(branch.id),
    };
    ctx.state.branchId = branch.id;
    ctx.state.branchSlug = branch.slug;

    return next();
  };
};

/**
 * Plugin middleware factory (`plugin::branches.resolve-branch`) for explicit
 * route-level use. The global registration happens in `bootstrap.ts`.
 */
const resolveBranch = (_config: unknown, { strapi }: { strapi: Core.Strapi }) =>
  createResolveBranchMiddleware(strapi);

export default resolveBranch;
