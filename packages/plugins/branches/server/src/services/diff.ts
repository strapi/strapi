import type { Core } from '@strapi/types';

import { getModel, isEqualValue, mergeChangeSets, threeWayMerge, type Conflict } from '../codec';
import {
  getBranchableContentTypes,
  getService,
  isLocalizedContentType,
  runUnfiltered,
  type BranchRef,
} from '../utils';
import { parentRefOf } from './resolve';

import type { Branch } from './branches';
import type { ChangeRow } from './changes';

export type ChangeKind = 'create' | 'update' | 'delete';

export interface ChangeSummary {
  contentType: string;
  documentId: string;
  locale: string | null;
  kind: ChangeKind;
  title: string | null;
  attributes: string[];
  conflicts: string[];
  updatedAt: string | null;
  updatedBy: { id: number; firstname?: string; lastname?: string; email?: string } | null;
}

export type AttributeDiffStatus = 'clean' | 'conflict' | 'same';

export interface AttributeDiff {
  attribute: string;
  type: string;
  base: unknown;
  parent: unknown;
  branch: unknown;
  status: AttributeDiffStatus;
}

export interface DocumentDiff {
  contentType: string;
  documentId: string;
  locale: string | null;
  title: string | null;
  attributes: AttributeDiff[];
}

export interface BranchChanges {
  changes: ChangeSummary[];
  counts: { create: number; update: number; delete: number; conflicts: number };
}

const getMainField = (uid: string): string | null => {
  try {
    const configuration = strapi
      .plugin('content-manager')
      .service('content-types')
      .findConfiguration(strapi.getModel(uid as never));
    const mainField = configuration?.settings?.mainField;
    if (
      typeof mainField === 'string' &&
      mainField !== 'id' &&
      getModel(uid).attributes[mainField]
    ) {
      return mainField;
    }
  } catch {
    // No configuration yet (fresh install): fall back to no title.
  }
  return null;
};

const titleOf = (uid: string, row: Record<string, unknown> | null | undefined): string | null => {
  const mainField = getMainField(uid);
  if (!mainField || !row) {
    return null;
  }
  const value = row[mainField];
  return value === null || value === undefined ? null : String(value);
};

const diffService = ({ strapi }: { strapi: Core.Strapi }) => {
  const service = {
    /**
     * Everything the branch changed, grouped per document: rows created on the
     * branch, deltas (with their unresolved conflicts against the parent's
     * current values) and tombstones.
     */
    async listChanges(branch: Branch): Promise<BranchChanges> {
      const branches = getService('branches');
      const changes = getService('changes');
      const resolve = getService('resolve');
      const ref = await branches.toRef(branch);
      const parentRef = parentRefOf(ref);
      const summaries: ChangeSummary[] = [];

      /* ---- created on the branch ---- */
      for (const contentType of getBranchableContentTypes(strapi)) {
        const uid = contentType.uid;
        const mainField = getMainField(uid);
        const rows: Array<Record<string, unknown> & { documentId: string; locale: string | null }> =
          await runUnfiltered(() =>
            strapi.db.query(uid).findMany({
              where: { branch: { id: ref.id }, publishedAt: null },
              select: ['documentId', 'locale', 'updatedAt', ...(mainField ? [mainField] : [])],
              populate: { updatedBy: { select: ['id', 'firstname', 'lastname', 'email'] } },
            })
          );
        const seen = new Set<string>();
        for (const row of rows) {
          const key = `${row.documentId}:${row.locale ?? ''}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          summaries.push({
            contentType: uid,
            documentId: row.documentId,
            locale: isLocalizedContentType(contentType) ? (row.locale ?? null) : null,
            kind: 'create',
            title: titleOf(uid, row),
            attributes: [],
            conflicts: [],
            updatedAt: (row.updatedAt as string) ?? null,
            updatedBy: (row.updatedBy as ChangeSummary['updatedBy']) ?? null,
          });
        }
      }

      /* ---- deltas and tombstones ---- */
      const deltas = await changes.listByBranch(ref.id);
      const grouped = new Map<string, ChangeRow[]>();
      for (const delta of deltas) {
        const key = `${delta.contentType}:${delta.entryDocumentId}`;
        grouped.set(key, [...(grouped.get(key) ?? []), delta]);
      }

      for (const rows of grouped.values()) {
        const { contentType: uid, entryDocumentId: documentId } = rows[0];
        if (!strapi.contentTypes[uid as keyof typeof strapi.contentTypes]) {
          continue;
        }
        const tombstones = rows.filter((row) => row.operation === 'delete');
        const updates = rows.filter((row) => row.operation === 'update');

        for (const tombstone of tombstones) {
          summaries.push({
            contentType: uid,
            documentId,
            locale: tombstone.entryLocale,
            kind: 'delete',
            title: null,
            attributes: [],
            conflicts: [],
            updatedAt: tombstone.updatedAt,
            updatedBy: (tombstone.updatedBy as ChangeSummary['updatedBy']) ?? null,
          });
        }

        if (updates.length === 0) {
          continue;
        }

        // One summary per locale row; the non-localized row is reported
        // under each locale it touches, or on its own when it is alone.
        const localizedRows = updates.filter((row) => row.entryLocale !== null);
        const shared = updates.find((row) => row.entryLocale === null);
        const perLocale = localizedRows.length > 0 ? localizedRows : shared ? [shared] : [];

        for (const row of perLocale) {
          const locale = row.entryLocale;
          const folded = mergeChangeSets([
            shared && row !== shared ? shared.changes : null,
            row.changes,
          ]);
          const foldedBase = mergeChangeSets([
            shared && row !== shared ? shared.base : null,
            row.base,
          ]);
          const parent = await resolve.resolveSnapshot(uid, documentId, locale, parentRef);
          const { conflicts } = parent
            ? threeWayMerge(uid, parent.snapshot, foldedBase, folded)
            : { conflicts: [] as Conflict[] };
          const branchRow = await resolve.resolveSnapshot(uid, documentId, locale, ref);

          summaries.push({
            contentType: uid,
            documentId,
            locale,
            kind: 'update',
            title: titleOf(uid, branchRow?.snapshot ?? parent?.row ?? null),
            attributes: Object.keys(folded),
            conflicts: conflicts.map((conflict) => conflict.attribute),
            updatedAt:
              [shared?.updatedAt, row.updatedAt]
                .filter((value): value is string => !!value)
                .sort()
                .at(-1) ?? null,
            updatedBy: (row.updatedBy as ChangeSummary['updatedBy']) ?? null,
          });
        }
      }

      summaries.sort((a, b) =>
        a.contentType === b.contentType
          ? (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
          : a.contentType.localeCompare(b.contentType)
      );

      return {
        changes: summaries,
        counts: {
          create: summaries.filter((s) => s.kind === 'create').length,
          update: summaries.filter((s) => s.kind === 'update').length,
          delete: summaries.filter((s) => s.kind === 'delete').length,
          conflicts: summaries.reduce((sum, s) => sum + s.conflicts.length, 0),
        },
      };
    },

    /**
     * Attribute-level diff of one document on the branch against the parent's
     * current values: base (when first touched) / parent (now) / branch.
     */
    async documentDiff(
      ref: BranchRef,
      uid: string,
      documentId: string,
      locale: string | null
    ): Promise<DocumentDiff | null> {
      const changes = getService('changes');
      const resolve = getService('resolve');
      const schema = getModel(uid);

      const rows = (await changes.getForDocuments([ref.id], uid, [documentId])).filter(
        (row) =>
          row.operation === 'update' && (row.entryLocale === null || row.entryLocale === locale)
      );
      if (rows.length === 0) {
        return null;
      }
      const ordered = changes.orderForFolding(rows, [ref.id], locale);
      const branchChanges = mergeChangeSets(ordered.map((row) => row.changes));
      const branchBase = mergeChangeSets(ordered.map((row) => row.base));

      const parent = await resolve.resolveSnapshot(uid, documentId, locale, parentRefOf(ref));
      const parentSnapshot = parent?.snapshot ?? {};
      const branchView = await resolve.resolveSnapshot(uid, documentId, locale, ref);

      const attributes: AttributeDiff[] = Object.keys(branchChanges).map((attribute) => {
        const base = branchBase[attribute];
        const parentValue = parentSnapshot[attribute];
        const branchValue = branchChanges[attribute];
        let status: AttributeDiffStatus;
        if (
          isEqualValue(schema, attribute, base, branchValue) ||
          isEqualValue(schema, attribute, parentValue, branchValue)
        ) {
          status = 'same';
        } else if (isEqualValue(schema, attribute, base, parentValue)) {
          status = 'clean';
        } else {
          status = 'conflict';
        }
        return {
          attribute,
          type: schema.attributes[attribute]?.type ?? 'unknown',
          base,
          parent: parentValue,
          branch: branchValue,
          status,
        };
      });

      return {
        contentType: uid,
        documentId,
        locale,
        title: titleOf(uid, branchView?.snapshot ?? parent?.row ?? null),
        attributes,
      };
    },
  };

  return service;
};

type DiffService = typeof diffService;

export default diffService;
export type { DiffService };
