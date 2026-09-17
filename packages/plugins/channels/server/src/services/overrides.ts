import type { Core } from '@strapi/types';

import { NO_LOCALE, OVERRIDE_MODEL_UID } from '../constants';
import { getCurrentUserId } from '../utils';

import type { Snapshot } from '../codec/types';

export type OverrideStatus = 'draft' | 'published';

export interface OverrideRow {
  id: number;
  channel: { id: number; slug?: string; name?: string; color?: string | null };
  contentType: string;
  entryDocumentId: string;
  /** `''` sentinel = the shared non-localized-attributes row (see NO_LOCALE). */
  entryLocale: string;
  status: OverrideStatus;
  overrides: Snapshot | null;
  createdAt: string;
  updatedAt: string;
}

const OVERRIDE_POPULATE = {
  channel: { select: ['id', 'slug', 'name', 'color'] },
};

/**
 * `entryLocale` uses the `''` sentinel in the database so the unique index
 * dedupes (NULLs are distinct in unique indexes); the service API speaks
 * `string | null` like the rest of the codebase.
 */
const toSentinel = (locale: string | null): string => locale ?? NO_LOCALE;

/**
 * The override store. One row per (channel, content type, document, locale,
 * status): `overrides` holds the overridden top-level attributes in snapshot
 * format. `locale: ''` holds the non-localized attributes of a localized
 * content type (and everything for non-localized ones) — applied to every
 * locale, which is what makes i18n's cross-locale sync unnecessary here.
 * `status` mirrors the entry's draft/published pair: draft rows are edited,
 * published rows only ever change through publish/unpublish/discard.
 */
const overridesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const query = () => strapi.db.query(OVERRIDE_MODEL_UID);

  const service = {
    async get(
      channelId: number,
      contentType: string,
      documentId: string,
      locale: string | null,
      status: OverrideStatus
    ): Promise<OverrideRow | null> {
      return query().findOne({
        where: {
          channel: { id: channelId },
          contentType,
          entryDocumentId: documentId,
          entryLocale: toSentinel(locale),
          status,
        },
        populate: OVERRIDE_POPULATE,
      });
    },

    /** Every override of one channel for the given documents — both statuses, all locales. */
    async getForDocuments(
      channelId: number,
      contentType: string,
      documentIds: string[]
    ): Promise<OverrideRow[]> {
      if (documentIds.length === 0) {
        return [];
      }
      return query().findMany({
        where: {
          channel: { id: channelId },
          contentType,
          entryDocumentId: { $in: documentIds },
        },
        populate: { channel: { select: ['id'] } },
      });
    },

    /** Every channel's overrides for one document (admin state panel, lifecycle handlers). */
    async getAllForDocument(
      contentType: string,
      documentId: string,
      status?: OverrideStatus
    ): Promise<OverrideRow[]> {
      return query().findMany({
        where: {
          contentType,
          entryDocumentId: documentId,
          ...(status ? { status } : {}),
        },
        populate: OVERRIDE_POPULATE,
      });
    },

    /**
     * Records overridden attributes on the draft row of (channel, document,
     * locale). Existing attributes are overwritten, others kept. Concurrent
     * first-writes race on the unique index: the loser retries once as an
     * update.
     */
    async upsert(
      channelId: number,
      contentType: string,
      documentId: string,
      locale: string | null,
      changes: Snapshot,
      status: OverrideStatus = 'draft'
    ): Promise<OverrideRow> {
      const userId = getCurrentUserId();

      const merge = async (): Promise<OverrideRow | null> => {
        const existing = await service.get(channelId, contentType, documentId, locale, status);
        if (!existing) {
          return null;
        }
        return query().update({
          where: { id: existing.id },
          data: {
            overrides: { ...(existing.overrides ?? {}), ...changes },
            ...(userId ? { updatedBy: userId } : {}),
          },
          populate: OVERRIDE_POPULATE,
        });
      };

      const merged = await merge();
      if (merged) {
        return merged;
      }

      try {
        return await query().create({
          data: {
            channel: channelId,
            contentType,
            entryDocumentId: documentId,
            entryLocale: toSentinel(locale),
            status,
            overrides: changes,
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          },
          populate: OVERRIDE_POPULATE,
        });
      } catch (error) {
        // Unique-index violation: another request created the row between our
        // read and our insert — fold into it instead.
        const retried = await merge();
        if (retried) {
          return retried;
        }
        throw error;
      }
    },

    /**
     * Removes attributes from a draft override row; deletes the row when
     * nothing is left. Returns the attributes still overridden.
     */
    async removeAttributes(
      channelId: number,
      contentType: string,
      documentId: string,
      locale: string | null,
      attributes: string[]
    ): Promise<string[]> {
      const existing = await service.get(channelId, contentType, documentId, locale, 'draft');
      if (!existing) {
        return [];
      }
      const remaining = { ...(existing.overrides ?? {}) };
      for (const attribute of attributes) {
        delete remaining[attribute];
      }
      const left = Object.keys(remaining);
      if (left.length === 0) {
        await query().delete({ where: { id: existing.id } });
        return [];
      }
      const userId = getCurrentUserId();
      await query().update({
        where: { id: existing.id },
        data: { overrides: remaining, ...(userId ? { updatedBy: userId } : {}) },
      });
      return left;
    },

    /** Drops a channel's draft override rows for a document (every locale unless one is given). */
    async removeForChannelDocument(
      channelId: number,
      contentType: string,
      documentId: string,
      locale?: string | null
    ): Promise<number> {
      const { count } = await query().deleteMany({
        where: {
          channel: { id: channelId },
          contentType,
          entryDocumentId: documentId,
          status: 'draft',
          ...(locale !== undefined ? { entryLocale: toSentinel(locale) } : {}),
        },
      });
      return count;
    },

    /**
     * Drops every channel's overrides for a document — both statuses. A
     * `locale` restricts the purge to that locale's rows; the shared `''` row
     * only goes with the whole document.
     */
    async removeForDocument(
      contentType: string,
      documentId: string,
      locale?: string | null
    ): Promise<number> {
      const { count } = await query().deleteMany({
        where: {
          contentType,
          entryDocumentId: documentId,
          ...(locale != null ? { entryLocale: locale } : {}),
        },
      });
      return count;
    },

    /** Drops every override row of a channel (channel deletion). */
    async removeForChannel(channelId: number): Promise<number> {
      const { count } = await query().deleteMany({ where: { channel: { id: channelId } } });
      return count;
    },

    /**
     * Publish snapshot: the published override rows of the published locales
     * (plus the shared `''` row) are replaced by copies of the draft rows.
     * Idempotent delete-then-copy in one transaction — safe against the
     * upstream double-`next()` habit and against publish recreating entry
     * rows (override keys never reference row ids).
     */
    async snapshotPublish(
      contentType: string,
      documentId: string,
      locales: Array<string | null>
    ): Promise<void> {
      const sentinels = [...new Set([NO_LOCALE, ...locales.map(toSentinel)])];
      await strapi.db.transaction(async () => {
        await query().deleteMany({
          where: {
            contentType,
            entryDocumentId: documentId,
            status: 'published',
            entryLocale: { $in: sentinels },
          },
        });
        const drafts: OverrideRow[] = await query().findMany({
          where: {
            contentType,
            entryDocumentId: documentId,
            status: 'draft',
            entryLocale: { $in: sentinels },
          },
          populate: { channel: { select: ['id'] } },
        });
        for (const row of drafts) {
          if (!row.overrides || Object.keys(row.overrides).length === 0) {
            continue;
          }
          await query().create({
            data: {
              channel: row.channel.id,
              contentType,
              entryDocumentId: documentId,
              entryLocale: row.entryLocale,
              status: 'published',
              overrides: row.overrides,
            },
          });
        }
      });
    },

    /**
     * Unpublish: keeps only the published override rows whose locale still has
     * a published base row. Called with the locales read back from the
     * database after the core unpublish ran — deriving the scope from params
     * would mean re-implementing core semantics (`'*'`, default-locale fill).
     */
    async pruneUnpublished(
      contentType: string,
      documentId: string,
      remainingLocales: Array<string | null>
    ): Promise<void> {
      if (remainingLocales.length === 0) {
        await query().deleteMany({
          where: { contentType, entryDocumentId: documentId, status: 'published' },
        });
        return;
      }
      const keep = [...new Set([NO_LOCALE, ...remainingLocales.map(toSentinel)])];
      await query().deleteMany({
        where: {
          contentType,
          entryDocumentId: documentId,
          status: 'published',
          entryLocale: { $notIn: keep },
        },
      });
    },

    /**
     * Document deletion: keeps only the rows (both statuses) whose locale
     * still has a base row; everything goes — the shared `''` row included —
     * when the document is gone entirely.
     */
    async pruneToRemaining(
      contentType: string,
      documentId: string,
      remainingLocales: Array<string | null>
    ): Promise<void> {
      if (remainingLocales.length === 0) {
        await query().deleteMany({ where: { contentType, entryDocumentId: documentId } });
        return;
      }
      const keep = [...new Set([NO_LOCALE, ...remainingLocales.map(toSentinel)])];
      await query().deleteMany({
        where: {
          contentType,
          entryDocumentId: documentId,
          entryLocale: { $notIn: keep },
        },
      });
    },

    /**
     * Discard snapshot: the draft override rows of the discarded locales
     * (plus the shared `''` row) are replaced by copies of the published rows
     * — the exact mirror of `snapshotPublish`.
     */
    async snapshotDiscard(
      contentType: string,
      documentId: string,
      locales: Array<string | null>
    ): Promise<void> {
      const sentinels = [...new Set([NO_LOCALE, ...locales.map(toSentinel)])];
      await strapi.db.transaction(async () => {
        await query().deleteMany({
          where: {
            contentType,
            entryDocumentId: documentId,
            status: 'draft',
            entryLocale: { $in: sentinels },
          },
        });
        const published: OverrideRow[] = await query().findMany({
          where: {
            contentType,
            entryDocumentId: documentId,
            status: 'published',
            entryLocale: { $in: sentinels },
          },
          populate: { channel: { select: ['id'] } },
        });
        for (const row of published) {
          if (!row.overrides || Object.keys(row.overrides).length === 0) {
            continue;
          }
          await query().create({
            data: {
              channel: row.channel.id,
              contentType,
              entryDocumentId: documentId,
              entryLocale: row.entryLocale,
              status: 'draft',
              overrides: row.overrides,
            },
          });
        }
      });
    },

    /** Clone: the source's draft overrides follow the new document, every channel. */
    async copyForClone(
      contentType: string,
      sourceDocumentId: string,
      targetDocumentId: string
    ): Promise<void> {
      const drafts: OverrideRow[] = await query().findMany({
        where: { contentType, entryDocumentId: sourceDocumentId, status: 'draft' },
        populate: { channel: { select: ['id'] } },
      });
      for (const row of drafts) {
        if (!row.overrides || Object.keys(row.overrides).length === 0) {
          continue;
        }
        await query().create({
          data: {
            channel: row.channel.id,
            contentType,
            entryDocumentId: targetDocumentId,
            entryLocale: row.entryLocale,
            status: 'draft',
            overrides: row.overrides,
          },
        });
      }
    },
  };

  return service;
};

type OverridesService = typeof overridesService;

export default overridesService;
export type { OverridesService };
