import type { Core } from '@strapi/types';

import {
  getBranchableContentTypes,
  getCurrentBranch,
  getService,
  isUnfilteredContext,
} from './utils';

/**
 * DB-level visibility net for branchable content types. Every raw
 * `strapi.db.query()` read — the document service's own queries included —
 * sees exactly the rows of the current branch's view:
 *
 *   main       → rows with no branch
 *   branch B   → rows with no branch or created on B's chain, minus the
 *                documents deleted (tombstoned) on the chain
 *
 * `runUnfiltered(...)` bypasses it for cross-branch listings. Writes that skip
 * the document service get the branch stamped by `beforeCreate`.
 */
export const registerDbNet = (strapi: Core.Strapi) => {
  const models = getBranchableContentTypes(strapi).map((contentType) => contentType.uid);
  if (models.length === 0) {
    return;
  }

  const applyVisibility = async (event: any) => {
    if (isUnfilteredContext()) {
      return;
    }
    const branch = getCurrentBranch();
    const conditions: Record<string, unknown>[] = [];

    if (!branch) {
      conditions.push({ branch: { id: { $null: true } } });
    } else {
      conditions.push({
        $or: [{ branch: { id: { $null: true } } }, { branch: { id: { $in: branch.chain } } }],
      });
      const tombstones = await getService('changes').getTombstones(branch.chain, event.model.uid);
      if (tombstones.all.length > 0) {
        conditions.push({ documentId: { $notIn: tombstones.all } });
      }
      for (const { documentId, locale } of tombstones.byLocale) {
        conditions.push({ $not: { $and: [{ documentId }, { locale }] } });
      }
    }

    event.params = event.params ?? {};
    const existing = event.params.where;
    if (existing) {
      event.params.where = { $and: [existing, ...conditions] };
    } else {
      event.params.where = conditions.length === 1 ? conditions[0] : { $and: conditions };
    }
  };

  const stampOnCreate = (event: any) => {
    if (!event?.params?.data || event.params.data.branch !== undefined) {
      return;
    }
    const branch = getCurrentBranch();
    if (branch) {
      event.params.data.branch = branch.id;
    }
  };

  strapi.db.lifecycles.subscribe({
    models,

    async beforeFindOne(event: any) {
      await applyVisibility(event);
    },
    async beforeFindMany(event: any) {
      await applyVisibility(event);
    },
    async beforeCount(event: any) {
      await applyVisibility(event);
    },
    beforeCreate(event: any) {
      stampOnCreate(event);
    },
  });
};
