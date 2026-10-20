import type { Core } from '@strapi/types';

import { emitAudit, errors } from '@strapi/utils';
import { Release } from '../../../shared/contracts/releases';
import { getService, lockRelease } from '../utils';
import {
  ALLOWED_WEBHOOK_EVENTS,
  AUDITED_EVENTS,
  OVERDUE_GRACE_PERIOD_MS,
  RELEASE_MODEL_UID,
} from '../constants';
import { runAsSystem } from '../audit-logs';

type LockedRelease = Pick<Release, 'id' | 'name' | 'releasedAt' | 'scheduledAt'>;

const isOverdue = (
  release: Pick<LockedRelease, 'releasedAt' | 'scheduledAt'>,
  overdueBefore: Date
): boolean =>
  !release.releasedAt && !!release.scheduledAt && new Date(release.scheduledAt) < overdueBefore;

const createSchedulingService = ({ strapi }: { strapi: Core.Strapi }) => {
  const scheduledJobs = new Map<Release['id'], string>();
  let sweepInProgress: Promise<Release[]> | null = null;

  return {
    async set(releaseId: Release['id'], scheduleDate: Date) {
      const id = String(releaseId); // callers pass both numeric (db row) and string (ctx.params) ids

      const release = await strapi.db
        .query(RELEASE_MODEL_UID)
        .findOne({ where: { id: releaseId, releasedAt: null } });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      const taskName = `publishRelease_${id}`;

      // Cancel first: strapi.cron.remove(name) stops every job with that name,
      // and Croner also rejects duplicate names if the scheduler assigns them.
      if (scheduledJobs.has(id)) {
        this.cancel(id);
      }

      strapi.cron.add({
        [taskName]: {
          async task() {
            const releaseService = getService('release', { strapi });

            // The system context attributes this run and its entry.publish/unpublish events to the scheduler.
            await runAsSystem({ strapi }, 'scheduler', () =>
              releaseService.publish(releaseId, { trigger: 'scheduled' })
            );
          },
          options: scheduleDate,
        },
      });

      scheduledJobs.set(id, taskName);

      return scheduledJobs;
    },

    cancel(releaseId: Release['id']) {
      const id = String(releaseId); // normalise to match key from set()

      if (scheduledJobs.has(id)) {
        strapi.cron.remove(scheduledJobs.get(id)!);
        scheduledJobs.delete(id);
      }

      return scheduledJobs;
    },

    getAll() {
      return scheduledJobs;
    },

    freezeOverdueReleases({ now = new Date() }: { now?: Date } = {}): Promise<Release[]> {
      if (!sweepInProgress) {
        sweepInProgress = this.sweepOverdueReleases(now).finally(() => {
          sweepInProgress = null;
        });
      }

      return sweepInProgress;
    },

    async sweepOverdueReleases(now: Date): Promise<Release[]> {
      if (strapi.db.inTransaction()) {
        throw new Error('The overdue sweep must not run inside a transaction');
      }

      const overdueBefore = new Date(now.getTime() - OVERDUE_GRACE_PERIOD_MS);

      const candidates: Pick<Release, 'id'>[] = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          releasedAt: null,
          scheduledAt: { $lt: overdueBefore },
        },
        select: ['id'],
      });

      const frozen: Release[] = [];

      for (const { id } of candidates) {
        try {
          const result = await strapi.db.transaction(async (): Promise<Release | null> => {
            const locked: LockedRelease | undefined = await lockRelease({ strapi }, id, [
              'id',
              'name',
              'releasedAt',
              'scheduledAt',
            ]);

            if (!locked || !isOverdue(locked, overdueBefore)) {
              return null;
            }

            return getService('release', { strapi }).recordMissedRun(id);
          });

          if (result) {
            // Its job, if one is still armed, has nothing left to run
            this.cancel(id);
            frozen.push(result);
          }
        } catch (error) {
          strapi.log.error(`[Content Releases] Couldn't freeze overdue release ${id}`, { error });
        }
      }

      for (const release of frozen) {
        try {
          await runAsSystem({ strapi }, 'scheduler', () => this.reportMissedSchedule(release));
        } catch (error) {
          strapi.log.error(
            `[Content Releases] Couldn't report that release ${release.id} missed its schedule`,
            { error }
          );
        }
      }

      return frozen;
    },

    async reportMissedSchedule(release: Release) {
      const error = new Error(`Release ${release.name} wasn't released at its scheduled time`);
      error.name = 'MissedSchedule';

      strapi.eventHub.emit(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
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
    },

    /**
     * On bootstrap, we can use this function to make sure to sync the scheduled jobs from the database that are not yet released
     * This is useful in case the server was restarted and the scheduled jobs were lost
     * This also could be used to sync different Strapi instances in case of a cluster
     */
    async syncFromDatabase() {
      const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          scheduledAt: {
            $gte: new Date(),
          },
          releasedAt: null,
        },
      });

      for (const release of releases) {
        this.set(release.id, release.scheduledAt);
      }

      return scheduledJobs;
    },
  };
};

export default createSchedulingService;
