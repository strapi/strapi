import { setCreatorFields, errors, emitAudit } from '@strapi/utils';

import type { Core, Struct, Data } from '@strapi/types';

import {
  ALLOWED_WEBHOOK_EVENTS,
  AUDITED_EVENTS,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_MODEL_UID,
} from '../constants';
import type {
  GetReleases,
  CreateRelease,
  CreateReleaseFromSkippedEntries,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
} from '../../../shared/contracts/releases';
import type {
  ReleaseAction,
  ReleaseActionOutcome,
  ReleaseActionReason,
} from '../../../shared/contracts/release-actions';
import type { UserInfo } from '../../../shared/types';
import {
  getService,
  getPublishOrderForContentTypes,
  getPublishabilityForActions,
  getValidationErrors,
  isReleaseBlocked,
  lockRelease,
} from '../utils';
import type { PublishabilityOutcome } from '../utils';
import { emitAuditOnCommit, getReleaseChanges } from '../audit-logs';

type PublishTrigger = 'manual' | 'scheduled';

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
}

// Only the error's name: driver errors can carry row contents in their message
const getErrorName = (error: unknown) => (error instanceof Error ? error.name : 'Error');

// A validation error raised by the run (e.g. a unique clash between two of its entries) keeps
// its field errors, like one found by the check before the run
const getErrorOutcome = (error: unknown): RecordedOutcome =>
  error instanceof errors.ValidationError
    ? { outcome: 'skipped_invalid', reason: { validation: { errors: getValidationErrors(error) } } }
    : { outcome: 'skipped_error', reason: { error: { name: getErrorName(error) } } };

// The run writes the validity it found, so a frozen action never contradicts its outcome: false
// exactly for the outcomes of an entry that isn't publishable. An entry that threw while being
// released (`skipped_error`) had passed the check.
const IS_ENTRY_VALID_BY_OUTCOME: Record<PublishabilityOutcome, false> &
  Record<Exclude<RunOutcome, PublishabilityOutcome>, true> = {
  published: true,
  unpublished: true,
  skipped_held: true,
  skipped_error: true,
  skipped_invalid: false,
  skipped_not_approved: false,
};

// Every entry the run didn't release counts as skipped, also one it recorded no outcome for
const getRunTotals = (
  entriesCount: number,
  outcomes: Map<ReleaseAction['id'], RecordedOutcome>
): RunTotals => {
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

type LockedPublishResult =
  | { kind: 'released'; release: RecordedRelease }
  | { kind: 'failed'; error: Error; release: RecordedRelease }
  | { kind: 'rejected'; error: Error };

const toError = (caught: unknown) =>
  caught instanceof Error ? caught : new Error('Release publish failed', { cause: caught });

const createReleaseService = ({ strapi }: { strapi: Core.Strapi }) => {
  const dispatchWebhook = (
    event: string,
    {
      isPublished,
      release,
      error,
    }: { isPublished: boolean; release: RecordedRelease; error?: unknown }
  ) => {
    strapi.eventHub.emit(event, {
      isPublished,
      error,
      release,
    });
  };

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

    const contentTypeUids = getPublishOrderForContentTypes(
      actions.map((action) => action.contentType),
      { strapi }
    );

    return contentTypeUids.flatMap((contentTypeUid) => [
      ...actions.filter(
        ({ contentType, type }) => contentType === contentTypeUid && type === 'publish'
      ),
      ...actions.filter(
        ({ contentType, type }) => contentType === contentTypeUid && type === 'unpublish'
      ),
    ]);
  };

  const releaseEntry = async (action: ReleaseAction) => {
    const params = { documentId: action.entryDocumentId, locale: action.locale };

    if (action.type === 'publish') {
      await strapi.documents(action.contentType).publish(params);
    } else {
      await strapi.documents(action.contentType).unpublish(params);
    }
  };

  // Entries without a reason share one write per outcome; a reason is written per entry
  const recordOutcomes = async (outcomes: Map<ReleaseAction['id'], RecordedOutcome>) => {
    const idsByOutcome = new Map<RunOutcome, ReleaseAction['id'][]>();
    for (const [id, { outcome, reason }] of outcomes) {
      if (reason) {
        await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
          where: { id },
          data: { outcome, reason, isEntryValid: IS_ENTRY_VALID_BY_OUTCOME[outcome] },
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
  const holdUnrecorded = (
    actions: ReleaseAction[],
    outcomes: Map<ReleaseAction['id'], RecordedOutcome>
  ) => {
    for (const action of actions) {
      if (!outcomes.has(action.id)) {
        outcomes.set(action.id, { outcome: 'skipped_held', reason: null });
      }
    }
  };

  // What a run did, written in its lock transaction: each entry's outcome, then the release's
  // status and totals. Whatever the outcome, the run is over: `releasedAt` freezes the release
  const recordRun = async (
    releaseId: Release['id'],
    {
      status,
      totals,
      outcomes,
    }: {
      status: Extract<Release['status'], 'done' | 'partial' | 'failed'>;
      totals: RunTotals;
      outcomes: Map<ReleaseAction['id'], RecordedOutcome>;
    }
  ): Promise<RecordedRelease> => {
    await recordOutcomes(outcomes);

    return strapi.db.query(RELEASE_MODEL_UID).update({
      where: { id: releaseId },
      data: { status, releasedAt: new Date(), ...totals },
    });
  };

  // The checks every new release goes through, before anything is written
  const validateNewRelease = async (
    releaseData: CreateRelease.Request['body'],
    { user }: { user: UserInfo }
  ) => {
    const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

    const {
      validatePendingReleasesLimit,
      validateUniqueNameForPendingRelease,
      validateScheduledAtIsLaterThanNow,
    } = getService('release-validation', { strapi });

    await Promise.all([
      validatePendingReleasesLimit(),
      validateUniqueNameForPendingRelease(releaseWithCreatorFields.name),
      validateScheduledAtIsLaterThanNow(releaseWithCreatorFields.scheduledAt),
    ]);

    return releaseWithCreatorFields;
  };

  // Takes validated data with creator fields. In a transaction, the audit waits for the commit.
  const insertRelease = async (releaseData: CreateRelease.Request['body']): Promise<Release> => {
    const release: Release = await strapi.db.query(RELEASE_MODEL_UID).create({
      data: {
        ...releaseData,
        status: 'empty',
      },
    });

    // Audited before scheduling: a scheduling failure shouldn't leave the write unrecorded
    await emitAuditOnCommit({ strapi }, AUDITED_EVENTS.RELEASE_CREATE, {
      releaseId: release.id,
      name: release.name,
      ...(release.scheduledAt && {
        scheduledAt: release.scheduledAt,
        timezone: release.timezone,
      }),
      releaseCondition: release.releaseCondition,
    });

    return release;
  };

  const scheduleCreatedRelease = async (release: Release) => {
    if (release.scheduledAt) {
      await getService('scheduling', { strapi }).set(release.id, release.scheduledAt);
    }

    strapi.telemetry.send('didCreateContentRelease');

    return release;
  };

  return {
    async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
      const release = await insertRelease(await validateNewRelease(releaseData, { user }));

      return scheduleCreatedRelease(release);
    },

    /**
     * Creates a release with the skipped entries of a partial or failed release (only
     * `actionIds`, if given). The source release is left untouched.
     */
    async createFromSkippedEntries(
      releaseId: CreateReleaseFromSkippedEntries.Request['params']['id'],
      { actionIds, ...releaseData }: CreateReleaseFromSkippedEntries.Request['body'],
      { user }: { user: UserInfo }
    ) {
      const sourceRelease: Pick<Release, 'id' | 'releasedAt' | 'status'> | null = await strapi.db
        .query(RELEASE_MODEL_UID)
        .findOne({ where: { id: releaseId }, select: ['id', 'releasedAt', 'status'] });

      if (!sourceRelease) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      if (!sourceRelease.releasedAt) {
        throw new errors.ValidationError('Release not published yet');
      }

      if (sourceRelease.status !== 'partial' && sourceRelease.status !== 'failed') {
        throw new errors.ValidationError('Release has no skipped entries');
      }

      const releaseWithCreatorFields = await validateNewRelease(releaseData, { user });

      const releaseActionService = getService('release-action', { strapi });
      // Read outside the transaction, so reading drafts doesn't hold it open
      const prepared = await releaseActionService.prepareSkippedActions(
        sourceRelease.id,
        actionIds
      );

      if (prepared.length === 0) {
        throw new errors.ValidationError(
          actionIds
            ? 'The requested entries can no longer be released'
            : 'Release has no skipped entries'
        );
      }

      const release: Release = await strapi.db.transaction(async () => {
        const createdRelease = await insertRelease(releaseWithCreatorFields);
        await releaseActionService.createPrepared(createdRelease.id, prepared);

        return strapi.db.query(RELEASE_MODEL_UID).findOne({ where: { id: createdRelease.id } });
      });

      return scheduleCreatedRelease(release);
    },

    async findOne(id: GetRelease.Request['params']['id'], query = {}) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query);
      const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
        ...dbQuery,
        where: { id },
      });

      return release;
    },

    findPage(query?: GetReleases.Request['query']) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query ?? {});

      return strapi.db.query(RELEASE_MODEL_UID).findPage({
        ...dbQuery,
        populate: {
          actions: {
            count: true,
          },
        },
      });
    },

    findMany(query?: any) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query ?? {});

      return strapi.db.query(RELEASE_MODEL_UID).findMany({
        ...dbQuery,
      });
    },

    async update(
      id: Data.ID,
      releaseData: UpdateRelease.Request['body'],
      { user }: { user: UserInfo }
    ) {
      const releaseWithCreatorFields = await setCreatorFields({ user, isEdition: true })(
        releaseData
      );

      const { validateUniqueNameForPendingRelease, validateScheduledAtIsLaterThanNow } = getService(
        'release-validation',
        { strapi }
      );

      await Promise.all([
        validateUniqueNameForPendingRelease(releaseWithCreatorFields.name, id),
        validateScheduledAtIsLaterThanNow(releaseWithCreatorFields.scheduledAt),
      ]);

      const { release, updatedRelease } = await strapi.db.transaction(async () => {
        const locked = await lockRelease({ strapi }, id, ['releasedAt']);

        if (!locked) {
          throw new errors.NotFoundError(`No release found for id ${id}`);
        }

        if (locked.releasedAt) {
          throw new errors.ValidationError('Release already published');
        }

        const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({ where: { id } });

        const updatedRelease = await strapi.db.query(RELEASE_MODEL_UID).update({
          where: { id },
          data: releaseWithCreatorFields,
        });

        if (!updatedRelease) {
          throw new errors.NotFoundError(`No release found for id ${id}`);
        }

        const changes = getReleaseChanges(release, updatedRelease);

        if (Object.keys(changes).length > 0) {
          await emitAuditOnCommit({ strapi }, AUDITED_EVENTS.RELEASE_UPDATE, {
            releaseId: updatedRelease.id,
            name: updatedRelease.name,
            changes,
          });
        }

        await this.updateReleaseStatus(id);

        return { release, updatedRelease };
      });

      const schedulingService = getService('scheduling', { strapi });

      if (releaseData.scheduledAt) {
        // set function always cancel the previous job if it exists, so we can call it directly
        await schedulingService.set(id, releaseData.scheduledAt);
      } else if (release.scheduledAt) {
        // When user don't send a scheduledAt and we have one on the release, means that user want to unschedule it
        schedulingService.cancel(id);
      }

      strapi.telemetry.send('didUpdateContentRelease');

      return updatedRelease;
    },

    async getAllComponents() {
      const contentManagerComponentsService = strapi
        .plugin('content-manager')
        .service('components');

      const components = await contentManagerComponentsService.findAllComponents();

      const componentsMap = components.reduce(
        (
          acc: { [key: Struct.ComponentSchema['uid']]: Struct.ComponentSchema },
          component: Struct.ComponentSchema
        ) => {
          acc[component.uid] = component;

          return acc;
        },
        {}
      );

      return componentsMap;
    },

    async delete(releaseId: DeleteRelease.Request['params']['id']) {
      const release: Release = await strapi.db.transaction(async () => {
        const locked = await lockRelease({ strapi }, releaseId, ['releasedAt']);

        if (!locked) {
          throw new errors.NotFoundError(`No release found for id ${releaseId}`);
        }

        if (locked.releasedAt) {
          throw new errors.ValidationError('Release already published');
        }

        const release: Release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
          where: { id: releaseId },
          populate: {
            actions: {
              select: ['id'],
            },
          },
        });

        await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
          where: {
            id: {
              $in: release.actions.map((action) => action.id),
            },
          },
        });

        await strapi.db.query(RELEASE_MODEL_UID).delete({
          where: {
            id: releaseId,
          },
        });

        return release;
      });

      if (release.scheduledAt) {
        const schedulingService = getService('scheduling', { strapi });
        await schedulingService.cancel(release.id);
      }

      strapi.telemetry.send('didDeleteContentRelease');

      await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_DELETE, {
        releaseId: release.id,
        name: release.name,
      });

      return release;
    },

    async publish(
      releaseId: PublishRelease.Request['params']['id'],
      { trigger }: { trigger: PublishTrigger }
    ) {
      const result = await strapi.db.transaction(async (): Promise<LockedPublishResult> => {
        /**
         * The release is locked for the whole run: another publish of it waits until this transaction ends.
         * The run's own failures are recorded as failed (recordFailedRun); any other error rolls everything back.
         */
        const lockedRelease = await lockRelease({ strapi }, releaseId, [
          'id',
          'name',
          'releasedAt',
          'status',
          'releaseCondition',
        ]);

        if (!lockedRelease) {
          throw new errors.NotFoundError(`No release found for id ${releaseId}`);
        }

        if (lockedRelease.releasedAt) {
          throw new errors.ValidationError('Release already published');
        }

        if (lockedRelease.status === 'failed') {
          throw new errors.ValidationError('Release failed to publish');
        }

        const allowPartial = lockedRelease.releaseCondition === 'allow_partial';
        // Written with the release's final status, in the lock transaction
        const outcomes = new Map<ReleaseAction['id'], RecordedOutcome>();

        try {
          strapi.log.info(`[Content Releases] Starting to publish release ${lockedRelease.name}`);

          const actions = await getActionsInRunOrder(releaseId);

          const recordFailedRun = async (runError: unknown): Promise<LockedPublishResult> => {
            const release = await recordRun(releaseId, {
              status: 'failed',
              totals: getRunTotals(actions.length, outcomes),
              outcomes,
            });

            return { kind: 'failed', error: toError(runError), release };
          };

          // Checked before anything is written: a publish that fails validation halfway can
          // already have removed the entry's published version
          const checks = await getPublishabilityForActions(
            actions.filter((action) => action.type === 'publish'),
            { strapi }
          );
          const notPublishable = checks.flatMap(({ action, publishability }) =>
            publishability.publishable ? [] : [{ action, error: publishability.error }]
          );
          const notPublishableIds = new Set(notPublishable.map(({ action }) => action.id));
          for (const { action, publishability } of checks) {
            if (!publishability.publishable) {
              const { outcome, reason } = publishability;
              outcomes.set(action.id, { outcome, reason });
            }
          }

          const firstNotPublishable = notPublishable.at(0);

          if (
            firstNotPublishable &&
            isReleaseBlocked(lockedRelease.releaseCondition, {
              total: actions.length,
              notPublishable: notPublishable.length,
            })
          ) {
            if (trigger === 'manual') {
              // Not a run: store the check's result so the status reads blocked, then reject
              const publishableIds = checks.flatMap(({ action, publishability }) =>
                publishability.publishable ? [action.id] : []
              );
              if (publishableIds.length > 0) {
                await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
                  where: { id: { $in: publishableIds } },
                  data: { isEntryValid: true, reason: null },
                });
              }

              for (const { action, publishability } of checks) {
                if (!publishability.publishable) {
                  await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
                    where: { id: action.id },
                    data: { isEntryValid: false, reason: publishability.reason },
                  });
                }
              }
              await this.updateReleaseStatus(releaseId);

              // Thrown after commit, so these writes are kept
              return { kind: 'rejected', error: firstNotPublishable.error };
            }

            if (!allowPartial) {
              holdUnrecorded(actions, outcomes);
            }

            return await recordFailedRun(
              allowPartial
                ? new errors.ValidationError('No entries were published')
                : firstNotPublishable.error
            );
          }

          const releasable = actions.filter((action) => !notPublishableIds.has(action.id));

          // Serialized, also within a content type: concurrent publishes of related documents
          // can race on shared join-table state (notably self-referential relations) and
          // leave inconsistent FK rows when one branch deletes a row another branch is
          // about to reference.
          if (allowPartial) {
            for (const action of releasable) {
              try {
                // Own savepoint: a failed publish has already removed the published version,
                // which must come back. On Postgres it also keeps the transaction usable.
                await strapi.db.savepoint(() => releaseEntry(action));
                const outcome = action.type === 'publish' ? 'published' : 'unpublished';
                outcomes.set(action.id, { outcome, reason: null });
              } catch (actionError) {
                outcomes.set(action.id, getErrorOutcome(actionError));
                strapi.log.warn(
                  `[Content Releases] Release ${lockedRelease.name}: skipped an entry that failed to ${action.type} (${getErrorName(actionError)})`
                );
              }
            }
          } else {
            // One savepoint for the whole run: the first error rolls back every entry before it
            let inFlight: ReleaseAction | undefined;
            try {
              await strapi.db.savepoint(async () => {
                for (const action of releasable) {
                  inFlight = action;
                  await releaseEntry(action);
                  inFlight = undefined;
                }
              });
            } catch (runError) {
              if (inFlight) {
                outcomes.set(inFlight.id, getErrorOutcome(runError));
              }
              holdUnrecorded(actions, outcomes);
              return await recordFailedRun(runError);
            }
            for (const action of releasable) {
              outcomes.set(action.id, {
                outcome: action.type === 'publish' ? 'published' : 'unpublished',
                reason: null,
              });
            }
          }

          const totals = getRunTotals(actions.length, outcomes);

          if (actions.length > 0 && totals.totalSkippedEntries === actions.length) {
            return await recordFailedRun(new errors.ValidationError('No entries were published'));
          }

          const release = await recordRun(releaseId, {
            status: totals.totalSkippedEntries === 0 ? 'done' : 'partial',
            totals,
            outcomes,
          });

          return { kind: 'released', release };
        } catch (caught) {
          throw toError(caught);
        }
      });

      // A manual publish that would release nothing never ran: no failure to record
      if (result.kind === 'rejected') {
        throw result.error;
      }

      // Webhook and audit only once the outcome is committed: a run that rolled back sends neither
      if (result.kind === 'failed') {
        const { error, release } = result;

        dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
          isPublished: false,
          error,
          release,
        });

        await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_TRIGGER, {
          releaseId: release.id,
          name: release.name,
          outcome: 'failure',
          reason: error.name,
        });

        throw error;
      }

      const { release } = result;

      dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, { isPublished: true, release });
      strapi.telemetry.send('didPublishContentRelease');

      // The audit's `failed` is the release's skipped entries
      await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_TRIGGER, {
        releaseId: release.id,
        name: release.name,
        outcome: release.status === 'done' ? 'success' : 'partial',
        published: release.totalPublishedEntries,
        unpublished: release.totalUnpublishedEntries,
        failed: release.totalSkippedEntries,
      });

      return release;
    },

    async recordMissedRun(releaseId: Release['id']): Promise<Release | null> {
      const actions: Pick<ReleaseAction, 'id'>[] = await strapi.db
        .query(RELEASE_ACTION_MODEL_UID)
        .findMany({ where: { release: { id: releaseId } }, select: ['id'] });

      const release: Release | null = await strapi.db.query(RELEASE_MODEL_UID).update({
        where: { id: releaseId, releasedAt: null },
        data: {
          status: 'failed',
          releasedAt: new Date(),
          failureReason: 'missed_schedule',
          totalPublishedEntries: 0,
          totalUnpublishedEntries: 0,
          totalSkippedEntries: actions.length,
        },
      });

      if (!release) {
        return null;
      }

      if (actions.length > 0) {
        await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
          where: { id: { $in: actions.map((action) => action.id) }, outcome: null },
          data: { outcome: 'skipped_missed' },
        });
      }

      return release;
    },

    // Under the release row lock that runs and action changes take: the status counts it reads
    // are those of the last committed change, so a status never lands after a newer one. (Not the
    // stored validity: a re-check reads the draft before the lock, so it can lag behind the draft.)
    async updateReleaseStatus(releaseId: Release['id']) {
      const releaseActionService = getService('release-action', { strapi });

      await strapi.db.transaction(async () => {
        const release = await lockRelease({ strapi }, releaseId, [
          'releaseCondition',
          'releasedAt',
          'status',
        ]);

        if (!release || release.releasedAt || release.status === 'failed') {
          return;
        }

        const [totalActions, invalidActions] = await Promise.all([
          releaseActionService.countActions({
            filters: {
              release: releaseId,
            },
          }),
          // Unpublish actions are always publishable, whatever validity an edit stored on them
          releaseActionService.countActions({
            filters: {
              release: releaseId,
              type: 'publish',
              isEntryValid: false,
            },
          }),
        ]);

        let status: Release['status'] = 'empty';

        if (totalActions > 0) {
          status = isReleaseBlocked(release.releaseCondition, {
            total: totalActions,
            notPublishable: invalidActions,
          })
            ? 'blocked'
            : 'ready';
        }

        await strapi.db
          .query(RELEASE_MODEL_UID)
          .update({ where: { id: releaseId }, data: { status } });
      });
    },
  };
};

export type ReleaseService = ReturnType<typeof createReleaseService>;

export default createReleaseService;
