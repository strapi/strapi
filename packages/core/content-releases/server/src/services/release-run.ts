import { errors } from '@strapi/utils';

import type { Core } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import { RELEASED_OUTCOME_BY_TYPE } from '../../../shared/constants';
import type { Release } from '../../../shared/contracts/releases';
import type {
  ReleaseAction,
  ReleaseActionOutcome,
  ReleaseActionReason,
} from '../../../shared/contracts/release-actions';
import {
  getErrorName,
  getService,
  getPublishOrderForContentTypes,
  getPublishabilityForActions,
  isFailedBeforeUpgrade,
  isMySqlDeadlock,
  isReleaseBlocked,
  toError,
  toErrorReason,
  toValidationReason,
  lockPlannedRelease,
  toEntryValidity,
} from '../utils';
import type { PublishabilityOutcome } from '../utils';

export type PublishTrigger = 'manual' | 'scheduled';

// Set by every run, so never null on what a run returns
export type RunTotals = {
  [K in 'totalPublishedEntries' | 'totalUnpublishedEntries' | 'totalSkippedEntries']: NonNullable<
    Release[K]
  >;
};

export type RecordedRelease = Pick<Release, 'id' | 'name' | 'releasedAt' | 'status'> & RunTotals;

type RunOutcome = Exclude<ReleaseActionOutcome, 'skipped_missed'>;

interface RecordedOutcome {
  outcome: RunOutcome;
  reason: ReleaseActionReason | null;
  // Overrides the validity the outcome implies (an entry whose check threw wasn't publishable)
  isEntryValid?: boolean;
}

// A validation error raised by the run (e.g. a unique clash between two of its entries) keeps
// its field errors, like one found by the check before the run
const getErrorOutcome = (error: unknown): RecordedOutcome =>
  error instanceof errors.ValidationError
    ? { outcome: 'skipped_invalid', reason: toValidationReason(error) }
    : { outcome: 'skipped_error', reason: toErrorReason(error) };

// The validity a run stores with each outcome, so the two never contradict each other (an
// outcome may override it: an entry whose check threw is stored as not valid)
const IS_ENTRY_VALID_BY_OUTCOME: Record<PublishabilityOutcome, false> &
  Record<Exclude<RunOutcome, PublishabilityOutcome>, true> = {
  published: true,
  unpublished: true,
  skipped_held: true,
  skipped_error: true,
  skipped_invalid: false,
  skipped_not_approved: false,
};

// Every entry the run didn't release counts as skipped
const getRunTotals = (entriesCount: number, outcomes: Outcomes): RunTotals => {
  let totalPublishedEntries = 0;
  let totalUnpublishedEntries = 0;
  for (const { outcome } of outcomes.values()) {
    if (outcome === 'published') {
      totalPublishedEntries += 1;
    } else if (outcome === 'unpublished') {
      totalUnpublishedEntries += 1;
    }
  }

  return {
    totalPublishedEntries,
    totalUnpublishedEntries,
    totalSkippedEntries: entriesCount - totalPublishedEntries - totalUnpublishedEntries,
  };
};

export type LockedPublishResult =
  | { kind: 'released'; release: RecordedRelease }
  | { kind: 'failed'; error: Error; release: RecordedRelease }
  | { kind: 'rejected'; error: Error };

type Outcomes = Map<ReleaseAction['id'], RecordedOutcome>;

const getReleasedOutcome = (action: ReleaseAction): RecordedOutcome => ({
  outcome: RELEASED_OUTCOME_BY_TYPE[action.type],
  reason: null,
});

/**
 * A release's run: what it checks, releases and records, under the release lock. Internal to the
 * release service (not a registered service), which passes it its status recalculation.
 */
export const createReleaseRun = ({
  strapi,
  updateReleaseStatus,
}: {
  strapi: Core.Strapi;
  updateReleaseStatus: (releaseId: Release['id']) => Promise<void>;
}) => {
  /**
   * Content types in relation dependency order (a relation's target before its source), then
   * within each type publishes before unpublishes, each in the order they were added.
   */
  const getActionsInRunOrder = async (releaseId: Release['id']) => {
    const actions = (await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
      where: {
        release: {
          id: releaseId,
        },
      },
      orderBy: { id: 'asc' },
    })) as ReleaseAction[];

    const contentTypeOrder = new Map(
      getPublishOrderForContentTypes(
        actions.map((action) => action.contentType),
        { strapi }
      ).map((contentTypeUid, index) => [contentTypeUid, index])
    );
    const rank = (action: ReleaseAction) =>
      contentTypeOrder.get(action.contentType)! * 2 + (action.type === 'unpublish' ? 1 : 0);

    // A stable sort keeps the order they were added within each rank
    return [...actions].sort((a, b) => rank(a) - rank(b));
  };

  const releaseEntry = async (action: ReleaseAction) => {
    const params = { documentId: action.entryDocumentId, locale: action.locale };

    if (action.type === 'publish') {
      await strapi.documents(action.contentType).publish(params);
    } else {
      await strapi.documents(action.contentType).unpublish(params);
    }
  };

  // Entries without a reason or validity override share one write per outcome; the others are
  // written per entry
  const recordOutcomes = async (outcomes: Outcomes) => {
    const idsByOutcome = new Map<RunOutcome, ReleaseAction['id'][]>();
    for (const [id, { outcome, reason, isEntryValid }] of outcomes) {
      if (reason || isEntryValid !== undefined) {
        await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
          where: { id },
          data: {
            outcome,
            reason,
            isEntryValid: isEntryValid ?? IS_ENTRY_VALID_BY_OUTCOME[outcome],
          },
        });
      } else {
        const ids = idsByOutcome.get(outcome) ?? [];
        ids.push(id);
        idsByOutcome.set(outcome, ids);
      }
    }

    for (const [outcome, ids] of idsByOutcome) {
      // Clears any reason stored before the run: the run's record replaces it
      await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
        where: { id: { $in: ids } },
        data: { outcome, reason: null, isEntryValid: IS_ENTRY_VALID_BY_OUTCOME[outcome] },
      });
    }
  };

  // An `all_or_nothing` run that releases nothing holds back every entry it didn't skip
  const holdUnrecorded = (actions: ReleaseAction[], outcomes: Outcomes) => {
    for (const action of actions) {
      if (!outcomes.has(action.id)) {
        outcomes.set(action.id, { outcome: 'skipped_held', reason: null });
      }
    }
  };

  // Each entry's outcome, then the release's status and totals: `releasedAt` freezes it
  const recordRun = async (
    releaseId: Release['id'],
    {
      status,
      totals,
      outcomes,
    }: {
      status: Extract<Release['status'], 'done' | 'partial' | 'failed'>;
      totals: RunTotals;
      outcomes: Outcomes;
    }
  ): Promise<RecordedRelease> => {
    await recordOutcomes(outcomes);

    return strapi.db.query(RELEASE_MODEL_UID).update({
      where: { id: releaseId },
      data: { status, releasedAt: new Date(), ...totals },
    });
  };

  // `allow_partial`: each entry in its own savepoint, so one that fails is skipped with its
  // published version restored, and the others still go out. Not after a MySQL deadlock: it
  // rolled back the whole run, so the run fails with it and records nothing.
  const releaseEachEntry = async (
    releaseName: string,
    actions: ReleaseAction[],
    outcomes: Outcomes
  ) => {
    // Serialized: concurrent publishes of related documents can race on shared join tables
    for (const action of actions) {
      try {
        await strapi.db.savepoint(() => releaseEntry(action));
        outcomes.set(action.id, getReleasedOutcome(action));
      } catch (actionError) {
        if (isMySqlDeadlock(actionError)) {
          throw actionError;
        }
        outcomes.set(action.id, getErrorOutcome(actionError));
        strapi.log.warn(
          `[Content Releases] Release ${releaseName}: skipped an entry that failed to ${action.type} (${getErrorName(actionError)})`
        );
      }
    }
  };

  // `all_or_nothing`: one savepoint for every entry, so the first error rolls back the ones
  // before it. Returns that error, unless it's a MySQL deadlock, which rolled back the whole run.
  const releaseAllEntries = async (
    actions: ReleaseAction[],
    outcomes: Outcomes
  ): Promise<{ error: unknown } | null> => {
    let inFlight: ReleaseAction | undefined;
    try {
      await strapi.db.savepoint(async () => {
        for (const action of actions) {
          inFlight = action;
          await releaseEntry(action);
          inFlight = undefined;
        }
      });
    } catch (error) {
      if (isMySqlDeadlock(error)) {
        throw error;
      }
      if (inFlight) {
        outcomes.set(inFlight.id, getErrorOutcome(error));
      }
      return { error };
    }

    for (const action of actions) {
      outcomes.set(action.id, getReleasedOutcome(action));
    }
    return null;
  };

  // A run, in the transaction that holds the release lock
  const runLocked = async (
    releaseId: Release['id'],
    trigger: PublishTrigger
  ): Promise<LockedPublishResult> => {
    const release = await lockPlannedRelease(releaseId, ['name', 'status', 'releaseCondition'], {
      strapi,
    });

    // Not frozen by the sweep yet
    if (isFailedBeforeUpgrade(release)) {
      throw new errors.ValidationError('Release failed to publish');
    }

    strapi.log.info(`[Content Releases] Starting to publish release ${release.name}`);

    const allowPartial = release.releaseCondition === 'allow_partial';
    const actions = await getActionsInRunOrder(releaseId);
    const outcomes: Outcomes = new Map();

    const fail = async (error: unknown): Promise<LockedPublishResult> => ({
      kind: 'failed',
      error: toError(error),
      release: await recordRun(releaseId, {
        status: 'failed',
        totals: getRunTotals(actions.length, outcomes),
        outcomes,
      }),
    });

    // Checked before anything is written: a publish that fails validation halfway can already
    // have removed the entry's published version
    const checks = await getPublishabilityForActions(actions, { strapi });
    // Not publishable: invalid or not approved (the entry's own error), or its check threw (stored
    // as not publishable, whatever the error class: a thrown check isn't a validation result)
    const entryErrors: Error[] = [];
    const checkErrors: Error[] = [];
    for (const [id, check] of checks) {
      if (check instanceof Error) {
        outcomes.set(id, {
          outcome: 'skipped_error',
          reason: toErrorReason(check),
          isEntryValid: false,
        });
        checkErrors.push(check);
      } else if (!check.publishable) {
        outcomes.set(id, { outcome: check.outcome, reason: check.reason });
        entryErrors.push(check.error);
      }
    }

    if (
      isReleaseBlocked(release.releaseCondition, {
        total: actions.length,
        notPublishable: entryErrors.length + checkErrors.length,
      })
    ) {
      if (trigger === 'manual') {
        // Not a run: the check is stored so the release reads blocked, then the publish is refused
        await getService('release-action', { strapi }).storePublishValidities(
          new Map([...checks].map(([id, check]) => [id, toEntryValidity(check)] as const))
        );
        await updateReleaseStatus(releaseId);

        // Refused like any blocked release (400), on an entry's own error first. What stopped a
        // check is named, never quoted: its message can carry row contents.
        return {
          kind: 'rejected',
          error:
            entryErrors[0] ??
            new errors.ValidationError(
              `An entry couldn't be checked (${getErrorName(checkErrors[0])})`
            ),
        };
      }

      if (!allowPartial) {
        holdUnrecorded(actions, outcomes);
      }

      return fail(
        allowPartial
          ? new errors.ValidationError('No entries were published')
          : (entryErrors[0] ?? checkErrors[0])
      );
    }

    const releasable = actions.filter((action) => !outcomes.has(action.id));

    if (allowPartial) {
      await releaseEachEntry(release.name, releasable, outcomes);
    } else {
      const failure = await releaseAllEntries(releasable, outcomes);
      if (failure) {
        holdUnrecorded(actions, outcomes);
        return fail(failure.error);
      }
    }

    const totals = getRunTotals(actions.length, outcomes);

    if (actions.length > 0 && totals.totalSkippedEntries === actions.length) {
      return fail(new errors.ValidationError('No entries were published'));
    }

    return {
      kind: 'released',
      release: await recordRun(releaseId, {
        status: totals.totalSkippedEntries === 0 ? 'done' : 'partial',
        totals,
        outcomes,
      }),
    };
  };

  return { runLocked };
};
