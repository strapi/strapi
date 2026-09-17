import type { Core } from '@strapi/types';

import { fromDocument, getSnapshotPopulate, mergeChangeSets, type Snapshot } from '../codec';
import {
  getService,
  hasDraftAndPublish,
  isLocalizedContentType,
  runOnBranch,
  type BranchRef,
} from '../utils';

export interface ResolvedView {
  /** The raw draft row the view is built on (main's, or an ancestor branch's). */
  row: Record<string, unknown> & { id: number | string; locale?: string | null };
  /** Snapshot after folding the chain's deltas. */
  snapshot: Snapshot;
}

/** The branch's parent as a scope (`null` = main). */
export const parentRefOf = (branch: BranchRef): BranchRef | null => {
  if (branch.chain.length <= 1) {
    return null;
  }
  const chain = branch.chain.slice(1);
  return { id: chain[0], slug: '', parentId: chain[1] ?? null, chain };
};

const resolveService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * The draft row of a document as visible from `branch` (chain visibility and
   * tombstones applied by the read net), read with the snapshot populate.
   */
  async findBaseRow(
    uid: string,
    documentId: string,
    locale: string | null,
    branch: BranchRef | null
  ): Promise<ResolvedView['row'] | null> {
    const model = strapi.getModel(uid as never);
    const where = {
      documentId,
      ...(isLocalizedContentType(model) && locale ? { locale } : {}),
      ...(hasDraftAndPublish(model) ? { publishedAt: null } : {}),
    };
    return runOnBranch(branch, () =>
      strapi.db.query(uid as never).findOne({ where, populate: getSnapshotPopulate(uid) })
    );
  },

  /**
   * Snapshot view of a document on `branch` (`null` = main): the base row plus
   * the chain's update deltas folded parent-most first.
   */
  async resolveSnapshot(
    uid: string,
    documentId: string,
    locale: string | null,
    branch: BranchRef | null
  ): Promise<ResolvedView | null> {
    const row = await this.findBaseRow(uid, documentId, locale, branch);
    if (!row) {
      return null;
    }
    const base = fromDocument(uid, row);
    if (!branch) {
      return { row, snapshot: base };
    }

    const changes = getService('changes');
    const rows = await changes.getForDocuments(branch.chain, uid, [documentId]);
    const ordered = changes.orderForFolding(
      rows.filter((change) => change.operation === 'update'),
      branch.chain,
      locale
    );
    return { row, snapshot: mergeChangeSets([base, ...ordered.map((change) => change.changes)]) };
  },
});

type ResolveService = typeof resolveService;

export default resolveService;
export type { ResolveService };
