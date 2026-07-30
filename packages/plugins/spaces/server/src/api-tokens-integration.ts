import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG, normalizeCapabilities } from './services/spaces';
import { getService } from './utils';
import { visibilityFilter, wrapControllerForVisibility } from './settings-visibility';

const API_TOKEN_UID = 'admin::api-token';

const TOKENS_LIST_RE = /^\/admin\/api-tokens\/?$/;
const TOKEN_DETAIL_RE = /^\/admin\/api-tokens\/(\d+)\/?$/;

type TokenAccessDecision =
  | { kind: 'allow' }
  | { kind: 'auto'; slug: string }
  | { kind: 'deny'; reason: string };

/**
 * Pure decision for a workspace-bound API token:
 *
 *   - unbound token (no slugs) → platform behavior, header optional.
 *   - bound + header inside the binding → allow.
 *   - bound + header outside the binding → deny. Changing the header value
 *     NEVER grants another workspace.
 *   - bound to exactly one workspace + no header → auto-scope to it (DX: the
 *     token IS the workspace selector).
 *   - bound to several + no header → deny, the caller must pick one.
 */
export const decideTokenWorkspaceAccess = (
  bindingSlugs: string[],
  headerSlug: string | undefined
): TokenAccessDecision => {
  if (bindingSlugs.length === 0) {
    return { kind: 'allow' };
  }

  if (headerSlug) {
    return bindingSlugs.includes(headerSlug)
      ? { kind: 'allow' }
      : { kind: 'deny', reason: `This API token has no access to the "${headerSlug}" workspace` };
  }

  if (bindingSlugs.length === 1) {
    return { kind: 'auto', slug: bindingSlugs[0] };
  }

  return {
    kind: 'deny',
    reason:
      'This API token is bound to several workspaces — pick one via the X-Strapi-Space-Id header',
  };
};

/**
 * Spaces × API tokens. Tokens are workspace-bound settings resources:
 *
 *   - **Binding** — hidden `spaces` M2M (injected in register.ts), written from
 *     the `spaces` body field on token create/update (managed from the default
 *     workspace), auto-bound to the active workspace when created elsewhere.
 *   - **Management scoping** — outside default, the token list only shows
 *     tokens bound to the active workspace (or platform-wide ones) and direct
 *     detail access to others is a 404.
 *   - **Runtime enforcement** — the content-api auth flow is wrapped so a bound
 *     token can only operate inside its workspaces (see
 *     `decideTokenWorkspaceAccess`). The binding lookup is cached per token
 *     (TTL) since it runs on every authenticated content-api request.
 */
export const patchApiTokensForSpaces = (strapi: Core.Strapi) => {
  /* ------------------------- Binding lookup cache ------------------------- */

  const TTL_MS = 30_000;
  const MAX_ENTRIES = 1_000;
  const bindingCache = new Map<number, { slugs: string[]; expiresAt: number }>();

  const getTokenBinding = async (tokenId: number): Promise<string[]> => {
    const hit = bindingCache.get(tokenId);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.slugs;
    }

    const populated = await strapi.db.query(API_TOKEN_UID).findOne({
      where: { id: tokenId },
      populate: { spaces: { select: ['slug'] } },
    });
    const slugs = (populated?.spaces ?? []).map((s: { slug: string }) => s.slug);

    if (bindingCache.size >= MAX_ENTRIES) {
      bindingCache.clear();
    }
    bindingCache.set(tokenId, { slugs, expiresAt: Date.now() + TTL_MS });

    return slugs;
  };

  /* --------------------- Runtime workspace enforcement -------------------- */

  // `compose-endpoint` resolves `strapi.get('auth').authenticate` at request
  // time, so wrapping the container method here IS observed by every route.
  // The wrapper interposes between a successful authentication and the rest of
  // the stack: `ctx.state.auth` is set, the controller hasn't run yet.
  const auth = strapi.get('auth');
  const originalAuthenticate = auth.authenticate.bind(auth);
  auth.authenticate = async (ctx: any, next: () => Promise<any>) => {
    return originalAuthenticate(ctx, async () => {
      const credentials = ctx.state?.auth?.credentials;
      const strategyName = ctx.state?.auth?.strategy?.name;

      if (strategyName === 'content-api-token' && credentials?.id) {
        const binding = await getTokenBinding(credentials.id);
        const decision = decideTokenWorkspaceAccess(binding, ctx.state?.spaceSlug);

        if (decision.kind === 'deny') {
          return ctx.forbidden(decision.reason);
        }

        if (decision.kind === 'auto') {
          const space = await getService('spaces').resolveHeaderValue(decision.slug);
          if (!space || space.status !== 'active') {
            return ctx.forbidden(
              `This API token is bound to the inactive workspace "${decision.slug}"`
            );
          }
          // The auto-scope happens AFTER the global capabilities guard ran
          // (headerless request → no slug back then), so the `contentApi`
          // capability must be re-checked here.
          if (normalizeCapabilities(space.capabilities).contentApi === false) {
            return ctx.notFound();
          }
          ctx.state.spaceId = space.id;
          ctx.state.spaceSlug = space.slug;
        }
      }

      return next();
    });
  };

  /* ----------------------- Management read/write scope --------------------- */

  const visibleTokenIds = async (spaceSlug: string): Promise<Set<number>> => {
    const rows = await strapi.db.query(API_TOKEN_UID).findMany({
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

    // Any token write invalidates the runtime binding cache.
    if (['POST', 'PUT', 'DELETE'].includes(ctx.method)) {
      bindingCache.clear();
    }

    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    if (!spaceSlug) {
      return next();
    }

    const isDefault = spaceSlug === DEFAULT_SPACE_SLUG;
    const detailMatch = ctx.path.match(TOKEN_DETAIL_RE);

    if (!isDefault) {
      // A token created from a workspace belongs to it (unless explicit).
      if (ctx.method === 'POST' && TOKENS_LIST_RE.test(ctx.path)) {
        const body = ctx.request?.body ?? {};
        if (body.spaces === undefined) {
          ctx.request.body = { ...body, spaces: [spaceSlug] };
        }
      }

      // Tokens not visible in this workspace don't exist for it.
      if (detailMatch && ['GET', 'PUT', 'DELETE'].includes(ctx.method)) {
        const ids = await visibleTokenIds(spaceSlug);
        if (!ids.has(Number(detailMatch[1]))) {
          return ctx.notFound('API token not found in this workspace');
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

    // Detail in the default workspace: attach bound slugs for the edit form.
    if (isDefault && detailMatch && ctx.body?.data?.id) {
      const populated = await strapi.db.query(API_TOKEN_UID).findOne({
        where: { id: ctx.body.data.id },
        populate: { spaces: { select: ['slug'] } },
      });
      ctx.body.data.spaces = (populated?.spaces ?? []).map((s: { slug: string }) => s.slug);
    }
  });

  // Write path: extract `spaces: string[]` before the admin's strict validation
  // rejects it, write the M2M after the controller succeeds.
  wrapControllerForVisibility(strapi, {
    contentTypeUid: API_TOKEN_UID,
    routes: [
      { method: 'POST', pathRegex: TOKENS_LIST_RE },
      { method: 'PUT', pathRegex: TOKEN_DETAIL_RE, isUpdate: true },
    ],
  });
};
