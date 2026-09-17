import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { CHANGE_MODEL_UID } from '../constants';
import { mergeChangeSets, threeWayMerge, toUpdateInput, type Snapshot } from '../codec';
import {
  getBranchableContentTypes,
  getCurrentUserId,
  getService,
  isLocalizedContentType,
  runOnBranch,
  runUnfiltered,
} from '../utils';
import { parentRefOf } from './resolve';

import type { Branch } from './branches';
import type { ChangeRow } from './changes';

const { ApplicationError, ValidationError } = errors;

/** `{ [uid]: { [documentId]: { [locale ?? '']: { [attribute]: 'branch' | 'parent' } } } }` */
export type MergeResolutions = Record<
  string,
  Record<string, Record<string, Record<string, 'branch' | 'parent'>>>
>;

export interface MergeSummary {
  branch: { id: number; slug: string; name: string };
  parent: { id: number; slug: string } | null;
  created: number;
  updated: number;
  deleted: number;
  skipped: Array<{
    contentType: string;
    documentId: string;
    locale: string | null;
    reason: string;
  }>;
}

interface UnresolvedConflict {
  contentType: string;
  documentId: string;
  locale: string | null;
  attribute: string;
}

const mergeService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Applies the branch onto its parent in one transaction:
   *   1. rows created on the branch are re-parented (one column flip);
   *   2. each delta is three-way merged with the parent's current values and
   *      written through the document service on the parent (a real write on
   *      main, a delta when the parent is itself a branch);
   *   3. tombstones delete on the parent;
   *   4. the branch is marked merged, its deltas dropped, its children re-parented.
   * Unresolved conflicts abort the merge before any write.
   */
  async merge(branch: Branch, resolutions: MergeResolutions = {}): Promise<MergeSummary> {
    if (branch.status !== 'active') {
      throw new ApplicationError(
        `Branch "${branch.name}" is ${branch.status} and cannot be merged`
      );
    }

    const branches = getService('branches');
    const changes = getService('changes');
    const resolve = getService('resolve');
    const ref = await branches.toRef(branch);
    const parentRef = parentRefOf(ref);
    const parentBranch = parentRef ? await branches.getById(parentRef.id) : null;
    if (parentRef && (!parentBranch || parentBranch.status !== 'active')) {
      throw new ApplicationError(
        'The parent branch is no longer active — re-parent this branch first'
      );
    }

    const userId = getCurrentUserId();
    const summary: MergeSummary = {
      branch: { id: branch.id, slug: branch.slug, name: branch.name },
      parent: parentBranch ? { id: parentBranch.id, slug: parentBranch.slug } : null,
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: [],
    };

    const deltas = await changes.listByBranch(ref.id);
    const grouped = new Map<string, ChangeRow[]>();
    for (const delta of deltas) {
      const key = `${delta.contentType}:${delta.entryDocumentId}`;
      grouped.set(key, [...(grouped.get(key) ?? []), delta]);
    }

    /* ---- pass 1: resolve every delta, abort on unresolved conflicts ---- */
    interface PlannedUpdate {
      uid: string;
      documentId: string;
      locale: string | null;
      writeLocale: string | null;
      targetEntryId: number | string;
      data: Snapshot;
    }
    interface PlannedDelete {
      uid: string;
      documentId: string;
      locale: string | null;
    }
    const plannedUpdates: PlannedUpdate[] = [];
    const plannedDeletes: PlannedDelete[] = [];
    const unresolved: UnresolvedConflict[] = [];

    for (const rows of grouped.values()) {
      const { contentType: uid, entryDocumentId: documentId } = rows[0];
      if (!strapi.contentTypes[uid as keyof typeof strapi.contentTypes]) {
        summary.skipped.push({
          contentType: uid,
          documentId,
          locale: null,
          reason: 'unknown content type',
        });
        continue;
      }
      const localized = isLocalizedContentType(strapi.getModel(uid as never));

      for (const tombstone of rows.filter((row) => row.operation === 'delete')) {
        plannedDeletes.push({ uid, documentId, locale: tombstone.entryLocale });
      }

      // Non-localized row first (i18n then syncs it across locales on main),
      // localized rows after so their values win on their own locale.
      const updates = rows
        .filter((row) => row.operation === 'update')
        .sort((a, b) => (a.entryLocale === null ? -1 : b.entryLocale === null ? 1 : 0));

      for (const row of updates) {
        const parent = await resolve.resolveSnapshot(uid, documentId, row.entryLocale, parentRef);
        if (!parent) {
          summary.skipped.push({
            contentType: uid,
            documentId,
            locale: row.entryLocale,
            reason: 'the document no longer exists on the parent',
          });
          continue;
        }

        const { merged, conflicts } = threeWayMerge(
          uid,
          parent.snapshot,
          row.base ?? {},
          row.changes ?? {}
        );
        const localeKey = row.entryLocale ?? '';
        for (const conflict of conflicts) {
          const choice = resolutions[uid]?.[documentId]?.[localeKey]?.[conflict.attribute];
          if (choice === 'branch') {
            merged[conflict.attribute] = conflict.branch;
          } else if (choice !== 'parent') {
            unresolved.push({
              contentType: uid,
              documentId,
              locale: row.entryLocale,
              attribute: conflict.attribute,
            });
          }
        }
        if (Object.keys(merged).length === 0) {
          continue;
        }
        plannedUpdates.push({
          uid,
          documentId,
          locale: row.entryLocale,
          writeLocale: localized
            ? (row.entryLocale ?? (parent.row.locale as string | null) ?? null)
            : null,
          targetEntryId: parent.row.id,
          data: merged,
        });
      }
    }

    if (unresolved.length > 0) {
      throw new ValidationError('Resolve every conflict before merging', {
        conflicts: unresolved,
      } as never);
    }

    /* ---- pass 2: write ---- */
    await strapi.db.transaction(async () => {
      // 1. created rows → parent (column flip, components and relations follow the row)
      for (const contentType of getBranchableContentTypes(strapi)) {
        const uid = contentType.uid;
        const rows: Array<{ id: number }> = await runUnfiltered(() =>
          strapi.db.query(uid).findMany({ where: { branch: { id: ref.id } }, select: ['id'] })
        );
        if (rows.length === 0) {
          continue;
        }
        await runUnfiltered(() =>
          strapi.db.query(uid).updateMany({
            where: { id: { $in: rows.map((row) => row.id) } },
            data: { branch: parentRef?.id ?? null },
          })
        );
        summary.created += rows.length;
      }

      // 2. deltas → document service on the parent
      for (const update of plannedUpdates) {
        const data = await runOnBranch(parentRef, () =>
          toUpdateInput(update.uid, update.data, { targetEntryId: update.targetEntryId })
        );
        await runOnBranch(parentRef, () =>
          strapi.documents(update.uid as never).update({
            documentId: update.documentId,
            ...(update.writeLocale ? { locale: update.writeLocale } : {}),
            status: 'draft',
            data: { ...data, ...(userId ? { updatedBy: userId } : {}) },
          } as never)
        );
        summary.updated += 1;
      }

      // 3. tombstones → delete on the parent
      for (const deletion of plannedDeletes) {
        const localized = isLocalizedContentType(strapi.getModel(deletion.uid as never));
        await runOnBranch(parentRef, () =>
          strapi.documents(deletion.uid as never).delete({
            documentId: deletion.documentId,
            ...(localized ? { locale: deletion.locale ?? '*' } : {}),
          } as never)
        );
        summary.deleted += 1;
      }

      // 4. bookkeeping
      const deltaIds: Array<{ id: number }> = await strapi.db
        .query(CHANGE_MODEL_UID)
        .findMany({ where: { branch: { id: ref.id } }, select: ['id'] });
      if (deltaIds.length > 0) {
        await strapi.db
          .query(CHANGE_MODEL_UID)
          .deleteMany({ where: { id: { $in: deltaIds.map((row) => row.id) } } });
      }
      for (const child of await branches.getChildren(ref.id)) {
        await branches.update(child.id, { parentId: parentRef?.id ?? null });
      }
      await branches.update(ref.id, { status: 'merged', mergedAt: new Date() });
    });

    branches.clearCache();
    strapi.eventHub.emit('branch.merge', {
      branch: summary.branch,
      parent: summary.parent,
      summary,
    });

    return summary;
  },
});

type MergeService = typeof mergeService;

export default mergeService;
export type { MergeService };
