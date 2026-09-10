import type { Core } from '@strapi/types';

import { lookupEntrySpaceId } from './utils/entry-space';
import { getRequestSpace, runUnscoped } from './utils/space-scope';

export { lookupEntrySpaceId };

export const RELEASE_UID = 'plugin::content-releases.release';
export const RELEASE_ACTION_UID = 'plugin::content-releases.release-action';

/** Actions a workspace sees: its own entries' plus the shared ones. */
export const visibleActionsWhere = (spaceId: number) => ({
  $or: [{ space: { id: spaceId } }, { space: { id: { $null: true } } }],
});

interface VisibleReleasesInput {
  allReleaseIds: number[];
  releaseIdsWithActions: Iterable<number>;
  releaseIdsWithVisibleActions: Iterable<number>;
}

/**
 * The releases a workspace sees: every release without actions (so a release
 * created from a sub-workspace shows up before entries are added), plus the
 * releases carrying at least one visible action.
 */
export const computeVisibleReleaseIds = ({
  allReleaseIds,
  releaseIdsWithActions,
  releaseIdsWithVisibleActions,
}: VisibleReleasesInput): number[] => {
  const withActions = new Set(releaseIdsWithActions);
  const visible = new Set(releaseIdsWithVisibleActions);
  return allReleaseIds.filter((id) => !withActions.has(id) || visible.has(id));
};

type BucketStatus = 'empty' | 'ready' | 'blocked' | 'done';

export interface ReleaseBucket {
  total: number;
  invalid: number;
  status: BucketStatus;
}

export const bucketStatus = (
  { total, invalid }: { total: number; invalid: number },
  released: boolean
): BucketStatus => {
  if (released) return 'done';
  if (total === 0) return 'empty';
  return invalid > 0 ? 'blocked' : 'ready';
};

/**
 * Spaces × content-releases. A release is cross-workspace; each workspace sees
 * only its own entries in it (plus shared ones), with a per-workspace
 * readiness (`GET /spaces/releases/:id/status`). Publishing is a default
 * workspace action (see `default-only-guard.ts`); scheduled publishes run
 * from cron without a request context and are therefore unscoped.
 *
 * Wiring: the release-action model carries a `space` relation (injected in
 * `register.ts`), stamped from the entry's workspace when the action is
 * created and kept in sync by the move service; the plugin installs the
 * releases' scope strategy for listings and counts.
 */
export const patchReleasesForSpaces = (strapi: Core.Strapi) => {
  const releasesPlugin = strapi.plugin('content-releases');
  if (!releasesPlugin) {
    return;
  }
  const actionService = releasesPlugin.service('release-action') as {
    setActionScopeStrategy?: (strategy: unknown) => void;
  };
  if (typeof actionService?.setActionScopeStrategy !== 'function') {
    return;
  }

  const visibleReleaseIdsFor = async (spaceId: number): Promise<number[]> =>
    runUnscoped(async () => {
      const [releases, actions] = await Promise.all([
        strapi.db.query(RELEASE_UID).findMany({ select: ['id'] }) as Promise<Array<{ id: number }>>,
        strapi.db.query(RELEASE_ACTION_UID).findMany({
          select: ['id'],
          populate: { release: { select: ['id'] }, space: { select: ['id'] } },
        }) as Promise<Array<{ release?: { id: number } | null; space?: { id: number } | null }>>,
      ]);
      const withActions = actions
        .map((action) => action.release?.id)
        .filter((id): id is number => typeof id === 'number');
      const withVisibleActions = actions
        .filter((action) => !action.space || action.space.id === spaceId)
        .map((action) => action.release?.id)
        .filter((id): id is number => typeof id === 'number');
      return computeVisibleReleaseIds({
        allReleaseIds: releases.map((release) => release.id),
        releaseIdsWithActions: withActions,
        releaseIdsWithVisibleActions: withVisibleActions,
      });
    });

  actionService.setActionScopeStrategy({
    async getActionWhere() {
      const request = getRequestSpace(strapi);
      if (!request || request.isDefault) {
        return null;
      }
      return visibleActionsWhere(request.id);
    },
    async getReleaseWhere() {
      const request = getRequestSpace(strapi);
      if (!request || request.isDefault) {
        return null;
      }
      return { id: { $in: await visibleReleaseIdsFor(request.id) } };
    },
  });

  // Actions follow the workspace of the entry they target.
  strapi.db.lifecycles.subscribe({
    models: [RELEASE_ACTION_UID],
    async beforeCreate(event: any) {
      const data = event?.params?.data;
      if (!data || data.space !== undefined) {
        return;
      }
      data.space = await lookupEntrySpaceId(
        strapi,
        data.contentType,
        data.entryDocumentId,
        data.locale
      );
    },
  });
};
