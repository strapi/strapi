import { pick } from 'lodash/fp';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { MAX_OVERLAY_DEPTH, NO_LOCALE } from '../constants';
import {
  applyOverlay,
  diffSnapshots,
  fromDocument,
  getDefaultLocale,
  getSnapshotPopulate,
  mergeChangeSets,
  splitChangesByLocale,
  toSnapshot,
} from '../codec';
import {
  getCurrentChannel,
  getOverlayDepth,
  getService,
  hasDraftAndPublish,
  isAvailableOnChannel,
  isChannelsEnabledContentType,
  isInternalScope,
  isLocalizedContentType,
  runInternal,
  type ChannelRef,
} from '../utils';

import type { OverrideRow, OverrideStatus } from '../services/overrides';

const { ValidationError } = errors;

const READ_ACTIONS = new Set(['findMany', 'findFirst', 'findOne']);

type Params = Record<string, any>;
type Ctx = { uid: string; contentType: any; action: string; params: Params };

const localeOf = async (model: unknown, params: Params): Promise<string | null> => {
  if (!isLocalizedContentType(model)) {
    return null;
  }
  if (typeof params.locale === 'string' && params.locale !== '*') {
    return params.locale;
  }
  return getDefaultLocale();
};

/**
 * Which override rows answer for a returned document. Draft & publish mirrors
 * the entry's own cohort (per document — a mixed read stays correct); without
 * D&P there is no published cohort, `draft` is the single canonical status.
 */
const statusOf = (model: unknown, doc: { publishedAt?: unknown }): OverrideStatus =>
  hasDraftAndPublish(model) && doc.publishedAt != null ? 'published' : 'draft';

/** Locales of the base rows still present for a document — for post-action pruning. */
const remainingLocales = async (
  strapi: Core.Strapi,
  uid: string,
  documentId: string,
  { publishedOnly = false }: { publishedOnly?: boolean } = {}
): Promise<Array<string | null>> => {
  const rows: Array<{ locale: string | null }> = await strapi.db.query(uid as never).findMany({
    where: { documentId, ...(publishedOnly ? { publishedAt: { $ne: null } } : {}) },
    select: ['locale'],
  });
  return [...new Set(rows.map((row) => row.locale ?? null))];
};

/**
 * The channels document-service middleware. Registered in the plugin's
 * `register()` so it runs ahead of i18n's, History's and Spaces' middlewares:
 * an update on a channel never reaches them (nothing is written to the row).
 *
 *   reads    → the entry, then the channel's overrides laid over it, then the
 *              channel-hidden attributes stripped (draft AND published)
 *   create   → base write (a channel cannot create documents); response
 *              presented for the channel
 *   update   → on a channel: an override delta, the base row untouched
 *   publish / unpublish / discardDraft / delete / clone
 *            → the core action, then the override rows snapshotted / pruned /
 *              copied to match — whatever channel (or none) made the call
 */
export const createChannelsMiddleware = (strapi: Core.Strapi) => {
  const presentForChannel = async (ctx: Ctx, result: unknown, channel: ChannelRef) => {
    const { uid, contentType: model } = ctx;
    const params = ctx.params ?? {};
    const docs = (Array.isArray(result) ? result : result ? [result] : []) as Array<
      Record<string, unknown> & {
        documentId?: string;
        locale?: string | null;
        publishedAt?: unknown;
        updatedAt?: unknown;
      }
    >;
    if (docs.length === 0) {
      return result;
    }

    const overrides = getService('overrides');
    const visibility = getService('visibility');
    const documentIds = [...new Set(docs.map((doc) => doc.documentId).filter(Boolean))] as string[];
    const rows = await overrides.getForDocuments(channel.id, uid, documentIds);

    const localized = isLocalizedContentType(model);
    const out: unknown[] = [];
    for (const doc of docs) {
      if (!doc.documentId) {
        out.push(doc);
        continue;
      }
      const status = statusOf(model, doc);
      const docRows = rows.filter(
        (row) => row.entryDocumentId === doc.documentId && row.status === status
      );
      const shared = docRows.find((row) => row.entryLocale === NO_LOCALE);
      const local =
        localized && doc.locale ? docRows.find((row) => row.entryLocale === doc.locale) : undefined;
      // Disjoint by construction: splitChangesByLocale routes every attribute
      // to exactly one of the two rows.
      const merged = mergeChangeSets([shared?.overrides, local?.overrides]);

      let overlaid: Record<string, unknown> = doc;
      if (Object.keys(merged).length > 0) {
        overlaid = await applyOverlay(uid, doc, merged, {
          populate: params.populate,
          fields: params.fields,
          locale: doc.locale ?? null,
        });
        const latest = [shared, local]
          .map((row) => row?.updatedAt)
          .filter(Boolean)
          .sort()
          .at(-1);
        if (latest) {
          const current = overlaid.updatedAt ? new Date(overlaid.updatedAt as string) : null;
          if (!current || new Date(latest as string) > current) {
            overlaid.updatedAt = latest;
          }
        }
      }
      out.push(visibility.stripHidden(uid, overlaid, channel.slug));
    }
    return Array.isArray(result) ? out : out[0];
  };

  const handleUpdate = async (ctx: Ctx, next: () => any, channel: ChannelRef) => {
    const { uid, contentType: model } = ctx;
    const params = ctx.params ?? {};
    const { documentId } = params;
    if (!documentId) {
      return next();
    }

    const localized = isLocalizedContentType(model);
    const draftAndPublish = hasDraftAndPublish(model);
    const locale = await localeOf(model, params);

    const row: (Record<string, unknown> & { id: number | string }) | null = await strapi.db
      .query(uid as never)
      .findOne({
        where: {
          documentId,
          ...(localized && locale ? { locale } : {}),
          ...(draftAndPublish ? { publishedAt: null } : {}),
        },
        populate: getSnapshotPopulate(uid),
      });

    if (!row) {
      // Unknown document (the document service answers 404) or a new locale
      // being created: locales are a base-level concern, pass through.
      return next();
    }

    /* ---- record an override delta instead of writing the row ---- */
    const overrides = getService('overrides');
    const visibility = getService('visibility');

    const base = fromDocument(uid, row);
    const [sharedRow, localRow] = await Promise.all([
      overrides.get(channel.id, uid, documentId, null, 'draft'),
      localized && locale ? overrides.get(channel.id, uid, documentId, locale, 'draft') : null,
    ]);
    const currentSnapshot = mergeChangeSets([base, sharedRow?.overrides, localRow?.overrides]);

    const data = (params.data ?? {}) as Record<string, unknown>;
    await strapi.entityValidator.validateEntityUpdate(
      model,
      data as never,
      { isDraft: true, locale: locale ?? undefined } as never,
      row as never
    );

    const nextSnapshot = await toSnapshot(uid, data, currentSnapshot, { locale });
    const changed = diffSnapshots(uid, currentSnapshot, nextSnapshot);

    if (changed.length > 0) {
      visibility.assertWritable(uid, changed, channel.slug);

      const toStore = pick(changed, nextSnapshot);
      const { localized: localizedChanges, nonLocalized } = splitChangesByLocale(uid, toStore);

      if (Object.keys(nonLocalized).length > 0) {
        await overrides.upsert(channel.id, uid, documentId, null, nonLocalized);
      }
      if (Object.keys(localizedChanges).length > 0) {
        await overrides.upsert(channel.id, uid, documentId, locale, localizedChanges);
      }

      strapi.eventHub.emit('channel.entry.update', {
        uid,
        documentId,
        locale,
        channel: { id: channel.id, slug: channel.slug },
        attributes: changed,
      });
    }

    // NOTE: `next()` is never called on this path — the base row is untouched
    // and a `status: 'published'` update param never chains into publish:
    // publishing stays a document-level operation, run from any channel.
    // Answer with the channel view, read through the full middleware chain so
    // the same overlay, sanitizers and populate apply as for any read.
    return strapi.documents(uid as never).findOne({
      documentId,
      ...(localized && locale ? { locale } : {}),
      ...(draftAndPublish ? { status: 'draft' } : {}),
      ...(params.populate !== undefined ? { populate: params.populate } : {}),
      ...(params.fields !== undefined ? { fields: params.fields } : {}),
    } as never);
  };

  const emitChannelEvents = async (
    event: 'channel.entry.publish' | 'channel.entry.unpublish',
    uid: string,
    documentId: string,
    status: OverrideStatus
  ) => {
    const rows = await getService('overrides').getAllForDocument(uid, documentId, status);
    const byChannel = new Map<number, OverrideRow>();
    for (const row of rows) {
      if (!byChannel.has(row.channel.id)) {
        byChannel.set(row.channel.id, row);
      }
    }
    for (const row of byChannel.values()) {
      strapi.eventHub.emit(event, {
        uid,
        documentId,
        channel: { id: row.channel.id, slug: row.channel.slug },
      });
    }
  };

  const handlePublish = async (ctx: Ctx, next: () => any) => {
    const result = await runInternal(() => next());
    const { uid } = ctx;
    const documentId = ctx.params?.documentId;
    const entries = (result as { entries?: Array<{ locale?: string | null }> })?.entries ?? [];
    if (documentId && entries.length > 0) {
      // The published locales come from the result — `params.locale` may be
      // `'*'`, absent, or filled downstream by i18n's default-locale step.
      const locales = [...new Set(entries.map((entry) => entry.locale ?? null))];
      await getService('overrides').snapshotPublish(uid, documentId, locales);
      await emitChannelEvents('channel.entry.publish', uid, documentId, 'published');
    }
    return result;
  };

  const handleUnpublish = async (ctx: Ctx, next: () => any) => {
    const result = await runInternal(() => next());
    const { uid } = ctx;
    const documentId = ctx.params?.documentId;
    if (documentId) {
      const remaining = await remainingLocales(strapi, uid, documentId, { publishedOnly: true });
      await getService('overrides').pruneUnpublished(uid, documentId, remaining);
      await emitChannelEvents('channel.entry.unpublish', uid, documentId, 'draft');
    }
    return result;
  };

  const handleDiscard = async (ctx: Ctx, next: () => any) => {
    const result = await runInternal(() => next());
    const { uid } = ctx;
    const documentId = ctx.params?.documentId;
    const entries = (result as { entries?: Array<{ locale?: string | null }> })?.entries ?? [];
    if (documentId && entries.length > 0) {
      const locales = [...new Set(entries.map((entry) => entry.locale ?? null))];
      await getService('overrides').snapshotDiscard(uid, documentId, locales);
    }
    return result;
  };

  const handleDelete = async (ctx: Ctx, next: () => any) => {
    const result = await runInternal(() => next());
    const { uid } = ctx;
    const documentId = ctx.params?.documentId;
    if (documentId) {
      const remaining = await remainingLocales(strapi, uid, documentId);
      await getService('overrides').pruneToRemaining(uid, documentId, remaining);
    }
    return result;
  };

  const handleClone = async (ctx: Ctx, next: () => any) => {
    const result = await runInternal(() => next());
    const { uid } = ctx;
    const sourceDocumentId = ctx.params?.documentId;
    const targetDocumentId = (result as { documentId?: string })?.documentId;
    if (sourceDocumentId && targetDocumentId) {
      await getService('overrides').copyForClone(uid, sourceDocumentId, targetDocumentId);
    }
    return result;
  };

  const middleware = async (ctx: Ctx, next: () => any): Promise<any> => {
    if (!isChannelsEnabledContentType(ctx.contentType)) {
      return next();
    }
    if (isInternalScope()) {
      // A lifecycle handler below is running the core action: the nested
      // document-service calls the core makes meanwhile (firstPublishedAt's
      // draft update inside publish, relation re-sync reads, …) are its own.
      return next();
    }

    const channel = getCurrentChannel();
    // CT-level binding: outside its `availableIn` channels the content type
    // serves the plain base — no overlay, no stripping, no overrides.
    const available = channel ? isAvailableOnChannel(ctx.contentType, channel.slug) : true;

    switch (ctx.action) {
      // Lifecycle actions maintain the override rows for EVERY channel, so
      // they run whether or not the caller is on one.
      case 'publish':
        return handlePublish(ctx, next);
      case 'unpublish':
        return handleUnpublish(ctx, next);
      case 'discardDraft':
        return handleDiscard(ctx, next);
      case 'delete':
        return handleDelete(ctx, next);
      case 'clone':
        return handleClone(ctx, next);
      case 'update':
        if (channel && !available) {
          throw new ValidationError(
            `"${ctx.uid}" has no channel variants on "${channel.slug}" — edit it on the default channel.`
          );
        }
        return channel ? handleUpdate(ctx, next, channel) : next();
      case 'create':
      default:
        if (channel && available && (READ_ACTIONS.has(ctx.action) || ctx.action === 'create')) {
          const result = await next();
          if (getOverlayDepth() > MAX_OVERLAY_DEPTH) {
            return result;
          }
          return presentForChannel(ctx, result, channel);
        }
        // count, base reads, …: untouched (counts reflect base rows — an
        // overlay never adds or removes a document).
        return next();
    }
  };

  return middleware as any;
};
