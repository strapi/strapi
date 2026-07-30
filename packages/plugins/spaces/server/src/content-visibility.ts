import type { Core } from '@strapi/types';

import { getService } from './utils';

const CM_LIST_RE = /^\/content-manager\/content-types\/?$/;
const CM_INIT_RE = /^\/content-manager\/init\/?$/;
const CM_DOCUMENT_RE = /^\/content-manager\/(?:collection|single)-types\/([^/?]+)/;

/**
 * Enforces the content-type ↔ workspace binding (`pluginOptions.spaces.visibleIn`)
 * everywhere content types surface. Binding it in the CTB means nothing if a
 * workspace can still SEE the content type — so, for the active workspace:
 *
 *   - `/content-manager/init` and `/content-manager/content-types` responses are
 *     stripped of non-visible content types → they vanish from the CM navigation.
 *   - Direct CM document routes on a non-visible content type are a 404.
 *   - Content API routes (`/api/<plural|singular>`) of a non-visible content
 *     type are a 404 — API consumers scoped to a workspace can't probe content
 *     types that workspace doesn't have.
 *
 * The rule is uniform — the default workspace only sees what's visible in
 * `default` too. Headerless callers (no active workspace) stay unfiltered.
 *
 * Components are NOT covered yet: they carry no workspace binding of their own
 * (the CTB component modal isn't wired) — a follow-up slice.
 */
export const registerContentVisibilityGuards = (strapi: Core.Strapi) => {
  // pluralName/singularName → uid map for content API path resolution. Content
  // types are frozen after load, so build once on first use.
  let apiNameToUid: Map<string, string> | null = null;
  const resolveApiUid = (path: string): string | undefined => {
    if (!apiNameToUid) {
      apiNameToUid = new Map();
      for (const ct of Object.values(strapi.contentTypes)) {
        const { uid, info } = ct as {
          uid: string;
          info?: { pluralName?: string; singularName?: string };
        };
        if (!uid.startsWith('api::')) continue;
        if (info?.pluralName) apiNameToUid.set(info.pluralName, uid);
        if (info?.singularName) apiNameToUid.set(info.singularName, uid);
      }
    }
    const prefix = (strapi.config.get('api.rest.prefix', '/api') as string).replace(/\/$/, '');
    if (!path.startsWith(`${prefix}/`)) return undefined;
    const first = path.slice(prefix.length + 1).split(/[/?]/, 1)[0];
    return apiNameToUid.get(first);
  };

  const isVisible = (uid: string | undefined, spaceSlug: string): boolean => {
    if (!uid) return true;
    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (!contentType) return true;
    return getService('visibility').isCTVisibleInSpace(contentType, spaceSlug);
  };

  strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    if (!spaceSlug) {
      return next();
    }

    /* ---- Guards (before the controller) ---- */

    const cmDocMatch = ctx.path.match(CM_DOCUMENT_RE);
    if (cmDocMatch && !isVisible(cmDocMatch[1], spaceSlug)) {
      return ctx.notFound('This content type is not available in this workspace');
    }

    const apiUid = resolveApiUid(ctx.path);
    if (apiUid && !isVisible(apiUid, spaceSlug)) {
      return ctx.notFound();
    }

    await next();

    /* ---- Response filtering (CM navigation sources) ---- */

    if (ctx.status >= 400 || ctx.method !== 'GET') {
      return;
    }

    if (CM_LIST_RE.test(ctx.path) && Array.isArray(ctx.body?.data)) {
      ctx.body.data = ctx.body.data.filter((item: { uid?: string }) =>
        isVisible(item.uid, spaceSlug)
      );
      return;
    }

    if (CM_INIT_RE.test(ctx.path) && Array.isArray(ctx.body?.data?.contentTypes)) {
      ctx.body.data.contentTypes = ctx.body.data.contentTypes.filter((item: { uid?: string }) =>
        isVisible(item.uid, spaceSlug)
      );
    }
  });
};
