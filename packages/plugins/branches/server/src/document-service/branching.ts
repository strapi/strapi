import { pick } from 'lodash/fp';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { MAX_OVERLAY_DEPTH } from '../constants';
import {
  applyOverlay,
  diffSnapshots,
  getDefaultLocale,
  mergeChangeSets,
  splitChangesByLocale,
  toSnapshot,
} from '../codec';
import { parentRefOf } from '../services/resolve';
import {
  getCurrentBranch,
  getOverlayDepth,
  getService,
  hasDraftAndPublish,
  isBranchableContentType,
  isLocalizedContentType,
  type BranchRef,
} from '../utils';

const { ForbiddenError } = errors;

const GATED_ACTIONS = new Set(['publish', 'unpublish', 'discardDraft']);
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
 * The branches document-service middleware. Registered in the plugin's
 * `register()` so it runs ahead of i18n's, History's and Spaces' middlewares:
 * an update on a branch never reaches them (nothing is written to the row).
 *
 *   reads    → the row, then the chain's deltas laid over it
 *   create   → a real row stamped with the branch
 *   update   → branch-local row: passthrough; inherited row: a delta
 *   delete   → branch-local row: passthrough; inherited row: a tombstone
 *   publish / unpublish / discardDraft → forbidden on a branch
 */
export const createBranchingMiddleware = (strapi: Core.Strapi) => {
  const overlayResult = async (ctx: Ctx, result: unknown, branch: BranchRef) => {
    const { uid, contentType: model } = ctx;
    const params = ctx.params ?? {};
    const draftAndPublish = hasDraftAndPublish(model);
    if (draftAndPublish && params.status === 'published') {
      return result;
    }
    const docs = (Array.isArray(result) ? result : result ? [result] : []) as Array<
      Record<string, unknown> & {
        documentId?: string;
        locale?: string | null;
        publishedAt?: unknown;
      }
    >;
    if (docs.length === 0) {
      return result;
    }

    const changes = getService('changes');
    const documentIds = [...new Set(docs.map((doc) => doc.documentId).filter(Boolean))] as string[];
    const rows = (await changes.getForDocuments(branch.chain, uid, documentIds)).filter(
      (row) => row.operation === 'update'
    );
    if (rows.length === 0) {
      return result;
    }

    const localized = isLocalizedContentType(model);
    const out: unknown[] = [];
    for (const doc of docs) {
      if (!doc.documentId || (draftAndPublish && doc.publishedAt)) {
        out.push(doc);
        continue;
      }
      const ordered = changes.orderForFolding(
        rows.filter((row) => row.entryDocumentId === doc.documentId),
        branch.chain,
        localized ? (doc.locale ?? null) : null
      );
      if (ordered.length === 0) {
        out.push(doc);
        continue;
      }
      const merged = mergeChangeSets(ordered.map((row) => row.changes));
      const overlaid = await applyOverlay(uid, doc, merged, {
        populate: params.populate,
        fields: params.fields,
        locale: doc.locale ?? null,
      });
      const latest = ordered
        .map((row) => row.updatedAt)
        .filter(Boolean)
        .sort()
        .at(-1);
      if (latest) {
        const current = overlaid.updatedAt ? new Date(overlaid.updatedAt as string) : null;
        if (!current || new Date(latest) > current) {
          overlaid.updatedAt = latest;
        }
      }
      out.push(overlaid);
    }
    return Array.isArray(result) ? out : out[0];
  };

  const handleUpdate = async (ctx: Ctx, next: () => any, branch: BranchRef) => {
    const { uid, contentType: model } = ctx;
    const params = ctx.params ?? {};
    const { documentId } = params;
    if (!documentId) {
      return next();
    }

    const localized = isLocalizedContentType(model);
    const draftAndPublish = hasDraftAndPublish(model);
    const locale = await localeOf(model, params);
    const where = {
      documentId,
      ...(localized && locale ? { locale } : {}),
      ...(draftAndPublish ? { publishedAt: null } : {}),
    };

    const row: { id: number; branch?: { id: number } | null } | null = await strapi.db
      .query(uid as never)
      .findOne({ where, select: ['id'], populate: { branch: { select: ['id'] } } });

    if (!row) {
      // No draft row for this locale on the branch's view. Either the document
      // does not exist (the document service answers) or this creates a new
      // locale of an inherited document: that row is new, so it is created for
      // real and stamped with the branch.
      const anyRow = await strapi.db
        .query(uid as never)
        .findOne({ where: { documentId }, select: ['id'] });
      if (anyRow) {
        ctx.params.data = { ...(params.data ?? {}), branch: branch.id };
      }
      return next();
    }

    if (row.branch?.id === branch.id) {
      // Branch-local row: a real write. Keep the row on its branch whatever
      // the payload says about `branch`.
      ctx.params.data = { ...(params.data ?? {}), branch: branch.id };
      return next();
    }

    /* ---- inherited row: record a delta instead of writing ---- */
    const resolve = getService('resolve');
    const changes = getService('changes');

    const currentView = await resolve.resolveSnapshot(uid, documentId, locale, branch);
    if (!currentView) {
      return next();
    }
    const parentView = await resolve.resolveSnapshot(uid, documentId, locale, parentRefOf(branch));

    const data = (params.data ?? {}) as Record<string, unknown>;
    await strapi.entityValidator.validateEntityUpdate(
      model,
      data as never,
      { isDraft: true, locale: locale ?? undefined } as never,
      currentView.row as never
    );

    const nextSnapshot = await toSnapshot(uid, data, currentView.snapshot, { locale });
    const changed = diffSnapshots(uid, currentView.snapshot, nextSnapshot);

    if (changed.length > 0) {
      const toStore = pick(changed, nextSnapshot);
      const { localized: localizedChanges, nonLocalized } = splitChangesByLocale(uid, toStore);
      const base = parentView?.snapshot ?? {};

      if (Object.keys(nonLocalized).length > 0) {
        await changes.upsert(branch.id, uid, documentId, null, {
          changes: nonLocalized,
          base: pick(Object.keys(nonLocalized), base),
        });
      }
      if (Object.keys(localizedChanges).length > 0) {
        await changes.upsert(branch.id, uid, documentId, locale, {
          changes: localizedChanges,
          base: pick(Object.keys(localizedChanges), base),
        });
      }

      strapi.eventHub.emit('branch.entry.update', {
        uid,
        documentId,
        locale,
        branch: { id: branch.id, slug: branch.slug },
        attributes: changed,
      });
    }

    // Answer with the branch view, read through the full middleware chain so
    // the same overlay, sanitizers and populate apply as for any read.
    return strapi.documents(uid as never).findOne({
      documentId,
      ...(localized && locale ? { locale } : {}),
      ...(draftAndPublish ? { status: 'draft' } : {}),
      ...(params.populate !== undefined ? { populate: params.populate } : {}),
      ...(params.fields !== undefined ? { fields: params.fields } : {}),
    } as never);
  };

  const handleDelete = async (ctx: Ctx, next: () => any, branch: BranchRef) => {
    const { uid, contentType: model } = ctx;
    const params = ctx.params ?? {};
    const { documentId } = params;
    if (!documentId) {
      return next();
    }

    const localized = isLocalizedContentType(model);
    const allLocales = params.locale === '*';
    const locale = allLocales ? null : await localeOf(model, params);

    const rows: Array<{ id: number; locale: string | null; branch?: { id: number } | null }> =
      await strapi.db.query(uid as never).findMany({
        where: { documentId, ...(localized && locale ? { locale } : {}) },
        select: ['id', 'locale'],
        populate: { branch: { select: ['id'] } },
      });
    if (rows.length === 0) {
      return next();
    }

    const inherited = rows.filter((row) => row.branch?.id !== branch.id);
    if (inherited.length === 0) {
      return next();
    }

    const changes = getService('changes');
    await changes.tombstone(branch.id, uid, documentId, localized ? locale : null);

    // Locales of this document created on the branch itself go for real.
    const local = rows.filter((row) => row.branch?.id === branch.id);
    for (const row of local) {
      await strapi.documents(uid as never).delete({
        documentId,
        ...(localized && row.locale ? { locale: row.locale } : {}),
      } as never);
    }

    strapi.eventHub.emit('branch.entry.delete', {
      uid,
      documentId,
      locale: localized ? locale : null,
      branch: { id: branch.id, slug: branch.slug },
    });

    return { documentId, entries: [] };
  };

  const middleware = async (ctx: Ctx, next: () => any): Promise<any> => {
    if (!isBranchableContentType(ctx.contentType)) {
      return next();
    }
    const branch = getCurrentBranch();
    if (!branch) {
      return next();
    }

    switch (ctx.action) {
      case 'publish':
      case 'unpublish':
      case 'discardDraft':
        throw new ForbiddenError(
          `Publishing is not available on branch "${branch.slug}". Merge it into main first.`
        );
      case 'create':
      case 'clone':
        ctx.params = ctx.params ?? {};
        ctx.params.data = { ...(ctx.params.data ?? {}), branch: branch.id };
        return next();
      case 'update':
        return handleUpdate(ctx, next, branch);
      case 'delete':
        return handleDelete(ctx, next, branch);
      default:
        if (READ_ACTIONS.has(ctx.action)) {
          const result = await next();
          if (getOverlayDepth() > MAX_OVERLAY_DEPTH) {
            return result;
          }
          return overlayResult(ctx, result, branch);
        }
        return next();
    }
  };

  return middleware as any;
};

export { GATED_ACTIONS };
