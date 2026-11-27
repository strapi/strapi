import { contentTypes } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { Context, Next } from 'koa';

import { isTrackedContentType } from '../domain/fields';
import { toPublicView, type Status } from '../services/provenance';
import { getService } from '../utils';

export const QUERY_PARAM = 'provenance';

// Core router handlers, e.g. `api::article.article.findOne`
const READ_HANDLER = /^(api::[^.]+\.[^.]+)\.(find|findOne)$/;

type Entry = Record<string, any>;

/**
 * The Content API read routes that accept `?provenance=true`.
 */
export const isProvenanceReadRoute = (route: Core.Route) => {
  return (
    route.method === 'GET' && typeof route.handler === 'string' && READ_HANDLER.test(route.handler)
  );
};

/**
 * Adds `meta.provenance` to Content API reads that ask for it with `?provenance=true`. It
 * only describes the fields of the response, so private fields and `fields` narrowing are
 * respected. For a list, `meta.provenance` is an array in the order of `data`.
 */
export const createQueryProvenanceMiddleware = ({ strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: Context, next: Next) => {
    await next();

    if (
      ctx.query?.[QUERY_PARAM] !== 'true' ||
      ctx.status !== 200 ||
      !getService(strapi, 'settings').isProvenanceEnabled()
    ) {
      return;
    }

    const route = ctx.state?.route;
    const match =
      route?.info?.type === 'content-api' && typeof route.handler === 'string'
        ? READ_HANDLER.exec(route.handler)
        : null;
    const uid = match?.[1];
    const contentType = uid ? strapi.contentTypes[uid as never] : undefined;
    const body = ctx.body as { data?: Entry | Entry[] | null; meta?: Entry } | undefined;

    if (!uid || !isTrackedContentType(uid) || !contentType || !body?.data) {
      return;
    }

    const status: Status =
      contentTypes.hasDraftAndPublish(contentType) && ctx.query.status === 'draft'
        ? 'draft'
        : 'published';
    const data = Array.isArray(body.data) ? body.data : [body.data];
    // A response narrowed with `fields` may not include the locale: fall back to the request's
    const requestLocale =
      typeof ctx.query.locale === 'string' && ctx.query.locale !== '*' ? ctx.query.locale : null;
    const groups = new Map<string | null, string[]>();

    data.forEach((entry) => {
      if (typeof entry?.documentId === 'string') {
        const locale = (entry.locale as string | undefined) ?? requestLocale;
        groups.set(locale, [...(groups.get(locale) ?? []), entry.documentId]);
      }
    });

    const values = getService(strapi, 'values');
    const stored = new Map<string, { locale: string | null; values: Entry }>();

    for (const [locale, documentIds] of groups) {
      const read = await values.readMany({ uid, locale, status, documentIds });

      read.forEach((version, documentId) => stored.set(`${documentId}|${locale}`, version));
    }

    // One position per entry of `data`; `null` for an entry that could not be matched
    const versions = data.map((entry) => {
      const locale = (entry?.locale as string | undefined) ?? requestLocale;
      const version = stored.get(`${entry?.documentId}|${locale}`);

      if (version === undefined) {
        return null;
      }

      return {
        documentId: entry.documentId as string,
        locale: version.locale,
        // Only the fields the response exposes
        values: Object.fromEntries(
          Object.entries(version.values).filter(([field]) => field in entry)
        ),
      };
    });

    const found = versions.filter((version) => version !== null);
    const views = await getService(strapi, 'provenance').getForEntries({
      uid,
      status,
      entries: found,
    });
    const toPublic = (fields: (typeof views)[number]) =>
      Object.fromEntries(
        Object.entries(fields).map(([name, field]) => [name, toPublicView(field)])
      );
    let index = 0;
    const provenance = versions.map((version) => {
      if (version === null) {
        return null;
      }

      index += 1;

      return toPublic(views[index - 1]);
    });

    body.meta = {
      ...body.meta,
      // A list is described entry by entry, in the order of `data`
      provenance: Array.isArray(body.data) ? provenance : provenance[0],
    };
  };
};
