import type { Modules } from '@strapi/types';

import type { Release } from '../../../shared/contracts/releases';
import { RELEASE_ACTION_MODEL_UID, RELEASED_OUTCOMES } from '../constants';
import type { ReleaseActionFilter } from '../constants';

// A filter on release actions, in the filter syntax the query engine's `where` takes
export type ReleaseActionWhere = Modules.Documents.Params.Filters.Any<
  typeof RELEASE_ACTION_MODEL_UID
>;

// An action of a planned release. The relation filter is a left join: the id check keeps out
// actions whose release no longer exists.
export const PLANNED_ACTION_WHERE = {
  outcome: null,
  release: { id: { $notNull: true }, releasedAt: { $null: true } },
};

// A publish action that can't publish now. One stored before validation existed counts too.
export const NOT_READY_ACTION_WHERE = {
  type: 'publish' as const,
  $or: [{ isEntryValid: false }, { isEntryValid: { $null: true } }],
};

// The actions of a release, narrowed by a filter
export const getReleaseActionsWhere = (
  releaseId: Release['id'],
  filter?: ReleaseActionFilter
): ReleaseActionWhere => {
  switch (filter) {
    case 'ready':
      return { release: releaseId, $or: [{ type: 'unpublish' }, { isEntryValid: true }] };
    case 'notReady':
      return { release: releaseId, ...NOT_READY_ACTION_WHERE };
    case 'released':
      return { release: releaseId, outcome: { $in: [...RELEASED_OUTCOMES] } };
    case 'skipped':
      return { release: releaseId, outcome: { $notIn: [...RELEASED_OUTCOMES] } };
    default:
      return { release: releaseId };
  }
};
