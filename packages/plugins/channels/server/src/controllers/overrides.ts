import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { getService, isChannelsEnabledContentType, isLocalizedContentType } from '../utils';

const { NotFoundError, ValidationError } = errors;

const assertEnabled = (uid: string) => {
  const model = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
  if (!model || !isChannelsEnabledContentType(model)) {
    throw new NotFoundError(`Unknown or channels-disabled content type: ${uid}`);
  }
  return model;
};

const localeParam = (model: unknown, raw: unknown): string | null =>
  isLocalizedContentType(model) && typeof raw === 'string' && raw ? raw : null;

const overrides = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /channels/overrides/:uid/:documentId?locale= — which attributes each
   * channel overrides on this document (draft rows; the panel and the field
   * badges consume it). The shared non-localized row counts for every locale.
   */
  async state(ctx: any) {
    const uid = String(ctx.params?.uid ?? '');
    const documentId = String(ctx.params?.documentId ?? '');
    const model = assertEnabled(uid);
    const locale = localeParam(model, ctx.query?.locale);

    const rows = await getService('overrides').getAllForDocument(uid, documentId, 'draft');
    const byChannel: Record<
      string,
      {
        channel: { id: number; slug: string; name?: string; color?: string | null };
        attributes: string[];
      }
    > = {};
    for (const row of rows) {
      if (row.entryLocale !== '' && locale !== null && row.entryLocale !== locale) {
        continue;
      }
      const slug = row.channel.slug ?? String(row.channel.id);
      byChannel[slug] ??= {
        channel: {
          id: row.channel.id,
          slug,
          name: row.channel.name,
          color: row.channel.color ?? null,
        },
        attributes: [],
      };
      byChannel[slug].attributes = [
        ...new Set([...byChannel[slug].attributes, ...Object.keys(row.overrides ?? {})]),
      ];
    }
    ctx.body = byChannel;
  },

  /**
   * POST /channels/overrides/:uid/:documentId/reset
   * body `{ channel: <slug>, locale?: <string|null>, attributes?: string[] }`
   * Omitted `attributes` drops the channel's draft override rows for the
   * document (the given locale's row and the shared row when no locale is
   * given); present, only those attributes are reverted. Draft only —
   * published overrides change through publish/unpublish alone.
   */
  async reset(ctx: any) {
    const uid = String(ctx.params?.uid ?? '');
    const documentId = String(ctx.params?.documentId ?? '');
    const model = assertEnabled(uid);
    const body = (ctx.request?.body ?? {}) as Record<string, unknown>;

    const slug = typeof body.channel === 'string' ? body.channel : '';
    const channel = slug ? await getService('channels').getBySlug(slug) : null;
    if (!channel) {
      throw new ValidationError(`Unknown channel: "${slug}"`);
    }
    const locale = localeParam(model, body.locale);

    const service = getService('overrides');
    if (Array.isArray(body.attributes) && body.attributes.length > 0) {
      const attributes = body.attributes.map(String);
      const remaining = new Set([
        ...(await service.removeAttributes(channel.id, uid, documentId, locale, attributes)),
        ...(await service.removeAttributes(channel.id, uid, documentId, null, attributes)),
      ]);
      ctx.body = { channel: slug, attributes: [...remaining] };
    } else {
      // The locale's row always goes; the shared row goes with it unless the
      // caller narrowed the reset to one locale of a localized content type.
      await service.removeForChannelDocument(channel.id, uid, documentId, locale);
      if (locale === null) {
        await service.removeForChannelDocument(channel.id, uid, documentId, null);
      }
      ctx.body = { channel: slug, attributes: [] };
    }

    strapi.eventHub.emit('channel.entry.reset', {
      uid,
      documentId,
      locale,
      channel: { id: channel.id, slug: channel.slug },
    });
  },
});

export default overrides;
