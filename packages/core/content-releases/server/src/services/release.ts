import { setCreatorFields, errors, emitAudit } from '@strapi/utils';

import type { Core, Struct, Data } from '@strapi/types';

import {
  ALLOWED_WEBHOOK_EVENTS,
  AUDITED_EVENTS,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_MODEL_UID,
} from '../constants';
import { RELEASE_STATUSES } from '../../../shared/constants';
import type { ReleaseFailureReason, ReleaseStatus } from '../../../shared/constants';
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
import type { ReleaseAction } from '../../../shared/contracts/release-actions';
import type { UserInfo } from '../../../shared/types';
import {
  getService,
  isFailedBeforeUpgrade,
  isReleaseBlocked,
  toError,
  lockPlannedRelease,
  lockRelease,
  NOT_READY_ACTION_WHERE,
} from '../utils';
import { emitAuditOnCommit, getReleaseChanges } from '../audit-logs';
import { createReleaseRun } from './release-run';
import type { PublishTrigger, RunTotals } from './release-run';

const createReleaseService = ({ strapi }: { strapi: Core.Strapi }) => {
  const dispatchWebhook = (
    event: string,
    {
      isPublished,
      release,
      error,
    }: { isPublished: boolean; release: Pick<Release, 'id' | 'name'>; error?: unknown }
  ) => {
    strapi.eventHub.emit(event, {
      isPublished,
      error,
      release,
    });
  };

  // The webhook and audit event of a release that froze as failed, so they always agree
  const reportFailedRun = async (release: Pick<Release, 'id' | 'name'>, error: Error) => {
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
  };

  // The webhook, telemetry and audit event of a release that froze as done or partial
  const reportReleasedRun = async (
    release: Pick<Release, 'id' | 'name' | 'status'> & RunTotals
  ) => {
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

  // Under the release lock, so the counts are those of the last committed change and a status
  // never lands after a newer one
  const updateReleaseStatus = async (releaseId: Release['id']) => {
    const releaseActionService = getService('release-action', { strapi });

    await strapi.db.transaction(async () => {
      const release = await lockRelease(releaseId, ['releaseCondition', 'releasedAt', 'status'], {
        strapi,
      });

      if (!release || release.releasedAt || isFailedBeforeUpgrade(release)) {
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
          filters: { release: releaseId, ...NOT_READY_ACTION_WHERE },
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
  };

  const { runLocked } = createReleaseRun({ strapi, updateReleaseStatus });

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

    async countByStatus(): Promise<Record<ReleaseStatus, number>> {
      const counts = await Promise.all(
        RELEASE_STATUSES.map(
          async (status) =>
            [status, await strapi.db.query(RELEASE_MODEL_UID).count({ where: { status } })] as const
        )
      );

      return Object.fromEntries(counts) as Record<ReleaseStatus, number>;
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

      const { release, updatedRelease, changes } = await strapi.db.transaction(async () => {
        const release = await lockPlannedRelease(
          id,
          ['name', 'scheduledAt', 'timezone', 'releaseCondition'],
          { strapi }
        );

        const updatedRelease = await strapi.db.query(RELEASE_MODEL_UID).update({
          where: { id },
          // An omitted schedule unschedules the release, as for its job below
          data: { ...releaseWithCreatorFields, scheduledAt: releaseData.scheduledAt ?? null },
        });

        if (!updatedRelease) {
          throw new errors.NotFoundError(`No release found for id ${id}`);
        }

        await updateReleaseStatus(id);

        return { release, updatedRelease, changes: getReleaseChanges(release, updatedRelease) };
      });

      // Once committed, and before the response: a client reading the log right after sees it whole
      if (Object.keys(changes).length > 0) {
        await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_UPDATE, {
          releaseId: updatedRelease.id,
          name: updatedRelease.name,
          changes,
        });
      }

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
        await lockPlannedRelease(releaseId, [], { strapi });

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
      // The release stays locked for the whole run. A failure the run records commits as
      // `failed`; any other error rolls everything back.
      const result = await strapi.db.transaction(() =>
        runLocked(releaseId, trigger).catch((caught: unknown) => {
          throw toError(caught);
        })
      );

      // A manual publish that would release nothing never ran: no failure to record
      if (result.kind === 'rejected') {
        throw result.error;
      }

      // Webhook and audit only once the outcome is committed: a run that rolled back sends neither
      if (result.kind === 'failed') {
        const { error, release } = result;
        await reportFailedRun(release, error);

        // The frozen release comes with the error, telling a run that failed from a refused publish
        throw error instanceof errors.ValidationError
          ? new errors.ValidationError(error.message, {
              ...(typeof error.details === 'object' && error.details),
              release,
            })
          : error;
      }

      const { release } = result;
      await reportReleasedRun(release);

      return release;
    },

    reportFailedRun,
    reportReleasedRun,

    // Freezes a release whose run never happened. An empty one missed nothing: it ends done, as
    // its run would have. Any other fails with every entry skipped. The caller holds the release
    // lock and has checked, under it, that the release is still planned.
    async recordMissedRun(
      releaseId: Release['id'],
      failureReason: ReleaseFailureReason
    ): Promise<(Release & RunTotals) | null> {
      const actions: Pick<ReleaseAction, 'id'>[] = await strapi.db
        .query(RELEASE_ACTION_MODEL_UID)
        .findMany({ where: { release: { id: releaseId } }, select: ['id'] });

      const endsDone = failureReason === 'missed_schedule' && actions.length === 0;

      const release: (Release & RunTotals) | null = await strapi.db
        .query(RELEASE_MODEL_UID)
        .update({
          where: { id: releaseId, releasedAt: null },
          data: {
            status: endsDone ? 'done' : 'failed',
            releasedAt: new Date(),
            failureReason: endsDone ? null : failureReason,
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

    updateReleaseStatus,
  };
};

export type ReleaseService = ReturnType<typeof createReleaseService>;

export default createReleaseService;
