import type { Release } from '../../../shared/contracts/releases';
import type { ReleaseCondition } from '../../../shared/constants';

/**
 * Whether a run would release nothing: the rule behind both the `blocked` status and the
 * publish-time check.
 * - `all_or_nothing` (or missing, before the condition existed): any entry not publishable.
 * - `allow_partial`: every entry not publishable.
 */
export const isReleaseBlocked = (
  releaseCondition: ReleaseCondition | null | undefined,
  { total, notPublishable }: { total: number; notPublishable: number }
) =>
  releaseCondition === 'allow_partial' ? total > 0 && notPublishable === total : notPublishable > 0;

// A run that failed before failed runs froze the release left it planned, as `failed`, until the
// overdue sweep freezes it
export const isFailedBeforeUpgrade = (release: Pick<Release, 'status' | 'releasedAt'>) =>
  !release.releasedAt && release.status === 'failed';
