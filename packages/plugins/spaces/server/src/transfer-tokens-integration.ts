import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';
import { visibilityFilter, wrapControllerForVisibility } from './settings-visibility';

const TRANSFER_TOKEN_UID = 'admin::transfer-token';

const TOKENS_LIST_RE = /^\/admin\/transfer\/tokens\/?$/;
const TOKEN_DETAIL_RE = /^\/admin\/transfer\/tokens\/(\d+)\/?$/;

/**
 * Spaces × transfer tokens — the same management scoping as API tokens:
 *
 *   - hidden `spaces` M2M (injected in register.ts), written from the `spaces`
 *     body field on create/update (managed from the default workspace),
 *     auto-bound to the active workspace when created elsewhere;
 *   - outside default, the list only shows tokens bound to the active
 *     workspace (or platform-wide ones) and direct detail access is a 404.
 *
 * TODO(spaces): runtime enforcement — scoping what a transfer token can
 * actually PUSH/PULL to its workspaces — is a slice of its own: the transfer
 * protocol streams whole-database batches and needs per-entity filtering.
 */
export const patchTransferTokensForSpaces = (strapi: Core.Strapi) => {
  const visibleTokenIds = async (spaceSlug: string): Promise<Set<number>> => {
    const rows = await strapi.db.query(TRANSFER_TOKEN_UID).findMany({
      where: visibilityFilter(spaceSlug),
      select: ['id'],
    });
    return new Set(rows.map((r: { id: number }) => r.id));
  };

  strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
    const isTokenRoute = TOKENS_LIST_RE.test(ctx.path) || TOKEN_DETAIL_RE.test(ctx.path);
    if (!isTokenRoute) {
      return next();
    }

    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    if (!spaceSlug) {
      return next();
    }

    const isDefault = spaceSlug === DEFAULT_SPACE_SLUG;
    const detailMatch = ctx.path.match(TOKEN_DETAIL_RE);

    if (!isDefault) {
      if (ctx.method === 'POST' && TOKENS_LIST_RE.test(ctx.path)) {
        const body = ctx.request?.body ?? {};
        if (body.spaces === undefined) {
          ctx.request.body = { ...body, spaces: [spaceSlug] };
        }
      }

      if (detailMatch && ['GET', 'PUT', 'DELETE'].includes(ctx.method)) {
        const ids = await visibleTokenIds(spaceSlug);
        if (!ids.has(Number(detailMatch[1]))) {
          return ctx.notFound('Transfer token not found in this workspace');
        }
      }
    }

    await next();

    if (ctx.status >= 400 || ctx.method !== 'GET') {
      return;
    }

    if (!isDefault && TOKENS_LIST_RE.test(ctx.path) && Array.isArray(ctx.body?.data)) {
      const ids = await visibleTokenIds(spaceSlug);
      ctx.body.data = ctx.body.data.filter((token: { id: number }) => ids.has(token.id));
      return;
    }

    if (isDefault && detailMatch && ctx.body?.data?.id) {
      const populated = await strapi.db.query(TRANSFER_TOKEN_UID).findOne({
        where: { id: ctx.body.data.id },
        populate: { spaces: { select: ['slug'] } },
      });
      ctx.body.data.spaces = (populated?.spaces ?? []).map((s: { slug: string }) => s.slug);
    }
  });

  wrapControllerForVisibility(strapi, {
    contentTypeUid: TRANSFER_TOKEN_UID,
    routes: [
      { method: 'POST', pathRegex: TOKENS_LIST_RE },
      { method: 'PUT', pathRegex: TOKEN_DETAIL_RE, isUpdate: true },
    ],
  });
};
