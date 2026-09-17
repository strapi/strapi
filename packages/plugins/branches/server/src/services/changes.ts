import type { Core } from '@strapi/types';

import { CHANGE_MODEL_UID } from '../constants';
import { getCurrentUserId, getRequestMemo } from '../utils';

import type { Snapshot } from '../codec/types';

export type ChangeOperation = 'update' | 'delete';

export interface ChangeRow {
  id: number;
  branch: { id: number };
  contentType: string;
  entryDocumentId: string;
  entryLocale: string | null;
  operation: ChangeOperation;
  changes: Snapshot | null;
  base: Snapshot | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: number } | null;
  updatedBy?: { id: number } | null;
}

export interface Tombstones {
  /** documentIds deleted in every locale. */
  all: string[];
  /** (documentId, locale) pairs deleted for one locale only. */
  byLocale: Array<{ documentId: string; locale: string }>;
}

export type DocumentBranchState = 'inherited' | 'modified' | 'created' | 'deleted';

const CHANGE_POPULATE = {
  branch: { select: ['id', 'slug', 'name', 'color'] },
  createdBy: { select: ['id', 'firstname', 'lastname', 'username', 'email'] },
  updatedBy: { select: ['id', 'firstname', 'lastname', 'username', 'email'] },
};

/**
 * The delta store. One row per (branch, content type, document, locale):
 * `changes` holds the touched top-level attributes in snapshot format, `base`
 * their value on the parent when first touched (3-way merge), `operation`
 * `delete` marks a tombstone. `locale: null` holds the non-localized attributes
 * of a localized content type (and everything for non-localized ones).
 */
const changesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const query = () => strapi.db.query(CHANGE_MODEL_UID);

  const invalidateMemo = () => getRequestMemo()?.clear();

  const service = {
    async find(
      branchId: number,
      contentType: string,
      documentId: string,
      locale: string | null
    ): Promise<ChangeRow | null> {
      return query().findOne({
        where: {
          branch: { id: branchId },
          contentType,
          entryDocumentId: documentId,
          entryLocale: locale,
        },
        populate: CHANGE_POPULATE,
      });
    },

    /**
     * Records touched attributes. Existing attributes are overwritten, others
     * kept; `base` is captured only the first time an attribute is touched so
     * it always describes the parent value the branch started from.
     */
    async upsert(
      branchId: number,
      contentType: string,
      documentId: string,
      locale: string | null,
      { changes, base }: { changes: Snapshot; base: Snapshot }
    ): Promise<ChangeRow> {
      const userId = getCurrentUserId();
      const existing = await service.find(branchId, contentType, documentId, locale);

      invalidateMemo();

      if (existing) {
        const mergedBase = { ...(existing.base ?? {}) };
        for (const attribute of Object.keys(changes)) {
          if (!(attribute in mergedBase)) {
            mergedBase[attribute] = base[attribute] ?? null;
          }
        }
        return query().update({
          where: { id: existing.id },
          data: {
            operation: 'update',
            changes: { ...(existing.changes ?? {}), ...changes },
            base: mergedBase,
            ...(userId ? { updatedBy: userId } : {}),
          },
          populate: CHANGE_POPULATE,
        });
      }

      const initialBase: Snapshot = {};
      for (const attribute of Object.keys(changes)) {
        initialBase[attribute] = base[attribute] ?? null;
      }

      return query().create({
        data: {
          branch: branchId,
          contentType,
          entryDocumentId: documentId,
          entryLocale: locale,
          operation: 'update',
          changes,
          base: initialBase,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
        populate: CHANGE_POPULATE,
      });
    },

    /**
     * Marks an inherited document as deleted on the branch. `locale: null`
     * deletes every locale and supersedes any per-locale rows.
     */
    async tombstone(
      branchId: number,
      contentType: string,
      documentId: string,
      locale: string | null
    ): Promise<void> {
      const userId = getCurrentUserId();
      invalidateMemo();

      if (locale === null) {
        await query().deleteMany({
          where: { branch: { id: branchId }, contentType, entryDocumentId: documentId },
        });
      } else {
        await query().deleteMany({
          where: {
            branch: { id: branchId },
            contentType,
            entryDocumentId: documentId,
            entryLocale: locale,
          },
        });
      }

      await query().create({
        data: {
          branch: branchId,
          contentType,
          entryDocumentId: documentId,
          entryLocale: locale,
          operation: 'delete',
          changes: null,
          base: null,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      });
    },

    /** Drops the branch's changes for a document (every locale unless one is given). */
    async remove(
      branchId: number,
      contentType: string,
      documentId: string,
      locale?: string | null
    ): Promise<number> {
      invalidateMemo();
      const { count } = await query().deleteMany({
        where: {
          branch: { id: branchId },
          contentType,
          entryDocumentId: documentId,
          ...(locale !== undefined ? { entryLocale: locale } : {}),
        },
      });
      return count;
    },

    /** Every delta of the chain for the given documents, any locale, any operation. */
    async getForDocuments(
      chain: number[],
      contentType: string,
      documentIds: string[]
    ): Promise<ChangeRow[]> {
      if (chain.length === 0 || documentIds.length === 0) {
        return [];
      }
      return query().findMany({
        where: {
          branch: { id: { $in: chain } },
          contentType,
          entryDocumentId: { $in: documentIds },
        },
        populate: { branch: { select: ['id'] } },
      });
    },

    /**
     * Tombstones of the chain for a content type, memoised per request: the
     * read net asks on every query.
     */
    async getTombstones(chain: number[], contentType: string): Promise<Tombstones> {
      if (chain.length === 0) {
        return { all: [], byLocale: [] };
      }
      const memo = getRequestMemo();
      const key = `tombstones:${chain.join('.')}:${contentType}`;
      const cached = memo?.get(key) as Tombstones | undefined;
      if (cached) {
        return cached;
      }

      const rows: Array<Pick<ChangeRow, 'entryDocumentId' | 'entryLocale'>> =
        await query().findMany({
          where: { branch: { id: { $in: chain } }, contentType, operation: 'delete' },
          select: ['entryDocumentId', 'entryLocale'],
        });

      const result: Tombstones = { all: [], byLocale: [] };
      for (const row of rows) {
        if (row.entryLocale === null) {
          result.all.push(row.entryDocumentId);
        } else {
          result.byLocale.push({ documentId: row.entryDocumentId, locale: row.entryLocale });
        }
      }
      result.all = [...new Set(result.all)];
      memo?.set(key, result);
      return result;
    },

    async listByBranch(branchId: number): Promise<ChangeRow[]> {
      return query().findMany({
        where: { branch: { id: branchId } },
        orderBy: [{ contentType: 'asc' }, { entryDocumentId: 'asc' }, { entryLocale: 'asc' }],
        populate: CHANGE_POPULATE,
      });
    },

    async countByBranch(branchId: number): Promise<number> {
      return query().count({ where: { branch: { id: branchId } } });
    },

    /** Deltas of any active branch for the given documents (the main list's "in branches" column). */
    async getForDocumentsAcrossBranches(
      contentType: string,
      documentIds: string[]
    ): Promise<ChangeRow[]> {
      if (documentIds.length === 0) {
        return [];
      }
      return query().findMany({
        where: {
          contentType,
          entryDocumentId: { $in: documentIds },
          branch: { status: 'active' },
        },
        populate: { branch: { select: ['id', 'slug', 'name', 'color'] } },
      });
    },

    /**
     * Orders the deltas of a chain for one document: parent-most first, and at
     * each level the non-localized (`locale: null`) row before the locale's row,
     * so `mergeChangeSets` can fold them left to right with the child winning.
     */
    orderForFolding(rows: ChangeRow[], chain: number[], locale: string | null): ChangeRow[] {
      const levels = [...chain].reverse();
      const ordered: ChangeRow[] = [];
      for (const branchId of levels) {
        const atLevel = rows.filter((row) => row.branch.id === branchId);
        const nonLocalized = atLevel.find((row) => row.entryLocale === null);
        if (nonLocalized) {
          ordered.push(nonLocalized);
        }
        if (locale !== null) {
          const localized = atLevel.find((row) => row.entryLocale === locale);
          if (localized) {
            ordered.push(localized);
          }
        }
      }
      return ordered;
    },
  };

  return service;
};

type ChangesService = typeof changesService;

export default changesService;
export type { ChangesService };
