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
} from '../utils';
import { getReleaseChanges } from '../audit-logs';

type PublishTrigger = 'manual' | 'scheduled';

type LockedRelease = Pick<Release, 'id' | 'name' | 'releasedAt' | 'status' | 'releaseCondition'>;

interface RunCounts {
  published: number;
  unpublished: number;
  failed: number;
}

interface RecordedOutcome {
  outcome: ReleaseActionOutcome;
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

type LockedPublishResult =
  | {
      kind: 'released';
      release: Pick<Release, 'id' | 'name' | 'releasedAt' | 'status'>;
      counts: RunCounts;
    }
  | {
      kind: 'failed';
      error: Error;
      release: Pick<Release, 'id' | 'name'>;
      // Partial when the error came after entries were released, and they stay released
      status: 'partial' | 'failed';
      counts: RunCounts;
    }
  | { kind: 'rejected'; error: Error };

const createReleaseService = ({ strapi }: { strapi: Core.Strapi }) => {
  const dispatchWebhook = (
    event: string,
    { isPublished, release, error }: { isPublished: boolean; release?: any; error?: unknown }
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
    const idsByOutcome = new Map<ReleaseActionOutcome, ReleaseAction['id'][]>();
    for (const [id, { outcome, reason }] of outcomes) {
      if (reason) {
        await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
          where: { id },
          data: { outcome, reason },
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
        data: { outcome, reason: null },
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
  // status. A run that released entries also sets `releasedAt`
  const recordRun = async (
    releaseId: Release['id'],
    {
      status,
      outcomes,
    }: {
      status: Extract<Release['status'], 'done' | 'partial' | 'failed'>;
      outcomes: Map<ReleaseAction['id'], RecordedOutcome>;
    }
  ) => {
    await recordOutcomes(outcomes);

    return strapi.db.query(RELEASE_MODEL_UID).update({
      where: { id: releaseId },
      data: { status, ...(status !== 'failed' && { releasedAt: new Date() }) },
    });
  };

  return {
    async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
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

      const release = await strapi.db.query(RELEASE_MODEL_UID).create({
        data: {
          ...releaseWithCreatorFields,
          status: 'empty',
        },
      });

      // Audited before scheduling: a scheduling failure shouldn't leave the write
      // unrecorded.
      await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_CREATE, {
        releaseId: release.id,
        name: release.name,
        ...(release.scheduledAt && {
          scheduledAt: release.scheduledAt,
          timezone: release.timezone,
        }),
        releaseCondition: release.releaseCondition,
      });

      if (releaseWithCreatorFields.scheduledAt) {
        const schedulingService = getService('scheduling', { strapi });

        await schedulingService.set(release.id, release.scheduledAt);
      }

      strapi.telemetry.send('didCreateContentRelease');

      return release;
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

      const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({ where: { id } });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${id}`);
      }

      if (release.releasedAt) {
        throw new errors.ValidationError('Release already published');
      }

      const updatedRelease = await strapi.db.query(RELEASE_MODEL_UID).update({
        where: { id },
        data: releaseWithCreatorFields,
      });

      // Audited before scheduling, against the pre-image read next to the write.
      // A write that matched no row (deleted in between) has nothing to report.
      if (updatedRelease) {
        const changes = getReleaseChanges(release, updatedRelease);

        if (Object.keys(changes).length > 0) {
          await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_UPDATE, {
            releaseId: updatedRelease.id,
            name: updatedRelease.name,
            changes,
          });
        }
      }

      const schedulingService = getService('scheduling', { strapi });

      if (releaseData.scheduledAt) {
        // set function always cancel the previous job if it exists, so we can call it directly
        await schedulingService.set(id, releaseData.scheduledAt);
      } else if (release.scheduledAt) {
        // When user don't send a scheduledAt and we have one on the release, means that user want to unschedule it
        schedulingService.cancel(id);
      }

      await this.updateReleaseStatus(id);

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
      const release: Release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
        where: { id: releaseId },
        populate: {
          actions: {
            select: ['id'],
          },
        },
      });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      if (release.releasedAt) {
        throw new errors.ValidationError('Release already published');
      }

      // Only delete the release and its actions is you in fact can delete all the actions and the release
      // Otherwise, if the transaction fails it throws an error
      await strapi.db.transaction(async () => {
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
      const result = await strapi.db.transaction(async ({ trx }): Promise<LockedPublishResult> => {
        /**
         * We lock the release in this transaction, so any other process trying to publish it will wait until this transaction is finished
         * In this transaction we don't care about rollback, becasue we want to persist the lock until the end and if it fails we want to change the release status to failed
         */
        const lockedRelease: LockedRelease | undefined = await strapi.db
          ?.queryBuilder(RELEASE_MODEL_UID)
          .where({ id: releaseId })
          .select(['id', 'name', 'releasedAt', 'status', 'releaseCondition'])
          .first()
          .transacting(trx)
          .forUpdate()
          .execute();

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
        // Released entries stay released even if the run then fails: the lock transaction commits
        const counts: RunCounts = { published: 0, unpublished: 0, failed: 0 };
        // Written with the release's final status, in the lock transaction
        const outcomes = new Map<ReleaseAction['id'], RecordedOutcome>();

        try {
          strapi.log.info(`[Content Releases] Starting to publish release ${lockedRelease.name}`);

          const actions = await getActionsInRunOrder(releaseId);

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
                  data: { isEntryValid: true },
                });
              }
              await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
                where: { id: { $in: [...notPublishableIds] } },
                data: { isEntryValid: false },
              });
              await this.updateReleaseStatus(releaseId);

              // Thrown after commit, so these writes are kept
              return { kind: 'rejected', error: firstNotPublishable.error };
            }

            if (!allowPartial) {
              holdUnrecorded(actions, outcomes);
            }

            throw allowPartial
              ? new errors.ValidationError('No entries were published')
              : firstNotPublishable.error;
          }

          const releasable = actions.filter((action) => !notPublishableIds.has(action.id));
          counts.failed = notPublishableIds.size;

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
                counts[outcome] += 1;
                outcomes.set(action.id, { outcome, reason: null });
              } catch (actionError) {
                counts.failed += 1;
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
              throw runError;
            }
            counts.published = releasable.filter((action) => action.type === 'publish').length;
            counts.unpublished = releasable.length - counts.published;
            for (const action of releasable) {
              outcomes.set(action.id, {
                outcome: action.type === 'publish' ? 'published' : 'unpublished',
                reason: null,
              });
            }
          }

          const releasedCount = counts.published + counts.unpublished;

          if (actions.length > 0 && releasedCount === 0) {
            throw new errors.ValidationError('No entries were published');
          }

          const release = await recordRun(releaseId, {
            status: releasedCount === actions.length ? 'done' : 'partial',
            outcomes,
          });

          dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
            isPublished: true,
            release,
          });

          strapi.telemetry.send('didPublishContentRelease');

          return { kind: 'released', release, counts };
        } catch (caught) {
          // Anything can be thrown, even null
          const error =
            caught instanceof Error
              ? caught
              : new Error('Release publish failed', { cause: caught });

          // We need to run the update in the same transaction because the release is locked.
          // An error after entries were released leaves the run partial: they stay released.
          const status = counts.published + counts.unpublished > 0 ? 'partial' : 'failed';

          try {
            // In the transaction too: a run the database rolls back records nothing
            await recordRun(releaseId, { status, outcomes });
          } catch {
            // The transaction can't be written to anymore (on Postgres, a database error outside
            // a savepoint aborts it): it rolls back, entries released by the run included
            dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, { isPublished: false, error });
            throw error;
          }

          // Sent once the outcome is written, so it never announces entries that get rolled back
          dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
            isPublished: status === 'partial',
            error,
          });

          // At this point, we don't want to throw the error because if that happen we rollback the change in the release status
          // We want to throw the error after the transaction is finished, so we return the error
          return { kind: 'failed', error, release: lockedRelease, status, counts };
        }
      });

      // A manual publish that would release nothing never ran: no failure to record
      if (result.kind === 'rejected') {
        throw result.error;
      }

      // The 'failed' or 'partial' status is already committed, so this emit cannot be rolled back.
      if (result.kind === 'failed') {
        const { error, release, status, counts } = result;
        // Only the error's name: driver errors can carry row contents
        const event = { releaseId: release.id, name: release.name, reason: error.name };

        await emitAudit(
          { strapi },
          AUDITED_EVENTS.RELEASE_TRIGGER,
          status === 'partial'
            ? { ...event, outcome: 'partial', ...counts }
            : { ...event, outcome: 'failure' }
        );

        throw error;
      }

      const { release } = result;

      await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_TRIGGER, {
        releaseId: release.id,
        name: release.name,
        outcome: release.status === 'done' ? 'success' : 'partial',
        ...result.counts,
      });

      // The response reports the release's entries, released or not. Counted after the publish,
      // while the actions still exist. A count failure doesn't fail the committed publish: the
      // error is returned.
      const releaseActionService = getService('release-action', { strapi });
      let counts = null;
      let countsError: Error | null = null;

      try {
        const [published, unpublished] = await Promise.all([
          releaseActionService.countActions({ filters: { release: releaseId, type: 'publish' } }),
          releaseActionService.countActions({
            filters: { release: releaseId, type: 'unpublish' },
          }),
        ]);
        counts = { published, unpublished };
      } catch (err) {
        countsError = err instanceof Error ? err : new Error(String(err), { cause: err });
        strapi.log.error(`Failed to count the entries of release ${releaseId}`, {
          error: countsError,
        });
      }

      return { release, counts, countsError };
    },

    async updateReleaseStatus(releaseId: Release['id']) {
      const releaseActionService = getService('release-action', { strapi });

      const releaseRead: Promise<Pick<Release, 'releaseCondition' | 'status'> | null> = strapi.db
        .query(RELEASE_MODEL_UID)
        .findOne({ where: { id: releaseId }, select: ['releaseCondition', 'status'] });

      const [totalActions, invalidActions, release] = await Promise.all([
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
        releaseRead,
      ]);

      // A failed release goes back to planned: what its run recorded no longer describes it, and
      // a later run that throws before recording anything must not show it as its own
      if (release?.status === 'failed') {
        await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
          where: { release: releaseId },
          data: { outcome: null, reason: null },
        });
      }

      let status: Release['status'] = 'empty';

      if (totalActions > 0) {
        status = isReleaseBlocked(release?.releaseCondition, {
          total: totalActions,
          notPublishable: invalidActions,
        })
          ? 'blocked'
          : 'ready';
      }

      return strapi.db.query(RELEASE_MODEL_UID).update({
        where: {
          id: releaseId,
        },
        data: {
          status,
        },
      });
    },
  };
};

export type ReleaseService = ReturnType<typeof createReleaseService>;

export default createReleaseService;
