import type { Core } from '@strapi/types';

import { errors } from '@strapi/utils';
import { Release } from '../../../shared/contracts/releases';
import { getService, isFailedBeforeUpgrade, lockRelease } from '../utils';
import { OVERDUE_GRACE_PERIOD_MS, RELEASE_MODEL_UID } from '../constants';
import type { ReleaseFailureReason } from '../constants';
import { runAsSystem } from '../audit-logs';

type SweepCandidate = Pick<Release, 'id' | 'name' | 'releasedAt' | 'scheduledAt' | 'status'>;

// What the sweep freezes: a release whose schedule passed the grace period, or one that failed
// before the upgrade
const getFailureReason = (
  release: Pick<SweepCandidate, 'releasedAt' | 'scheduledAt' | 'status'>,
  overdueBefore: Date
): ReleaseFailureReason | null => {
  if (release.releasedAt) {
    return null;
  }

  if (isFailedBeforeUpgrade(release)) {
    return 'failed_before_upgrade';
  }

  return release.scheduledAt && new Date(release.scheduledAt) < overdueBefore
    ? 'missed_schedule'
    : null;
};

const createSchedulingService = ({ strapi }: { strapi: Core.Strapi }) => {
  const scheduledJobs = new Map<Release['id'], string>();
  let sweepInProgress: Promise<Release[]> | null = null;

  const cancel = (releaseId: Release['id']) => {
    const id = String(releaseId); // normalise to match key from set()

    if (scheduledJobs.has(id)) {
      strapi.cron.remove(scheduledJobs.get(id)!);
      scheduledJobs.delete(id);
    }

    return scheduledJobs;
  };

  const reportMissedSchedule = async (release: Release) => {
    const error = new Error(`Release ${release.name} wasn't released at its scheduled time`);
    error.name = 'MissedSchedule';

    await getService('release', { strapi }).reportFailedRun(release, error);
  };

  const sweepOverdueReleases = async (now: Date): Promise<Release[]> => {
    if (strapi.db.inTransaction()) {
      throw new Error('The overdue sweep must not run inside a transaction');
    }

    const overdueBefore = new Date(now.getTime() - OVERDUE_GRACE_PERIOD_MS);

    const candidates: Pick<Release, 'id'>[] = await strapi.db.query(RELEASE_MODEL_UID).findMany({
      where: {
        releasedAt: null,
        $or: [{ scheduledAt: { $lt: overdueBefore } }, { status: 'failed' }],
      },
      select: ['id'],
    });

    const frozen: Release[] = [];

    for (const { id } of candidates) {
      try {
        const result = await strapi.db.transaction(async (): Promise<Release | null> => {
          const locked: SweepCandidate | undefined = await lockRelease(
            id,
            ['id', 'name', 'releasedAt', 'scheduledAt', 'status'],
            { strapi }
          );
          const failureReason = locked && getFailureReason(locked, overdueBefore);

          return failureReason
            ? getService('release', { strapi }).recordMissedRun(id, failureReason)
            : null;
        });

        if (result) {
          // Its job, if one is still armed, has nothing left to run
          cancel(id);
          frozen.push(result);
        }
      } catch (error) {
        strapi.log.error(`[Content Releases] Couldn't freeze overdue release ${id}`, { error });
      }
    }

    // A release that failed before the upgrade already reported its failure then
    for (const release of frozen.filter(
      ({ failureReason }) => failureReason === 'missed_schedule'
    )) {
      try {
        await runAsSystem({ strapi }, 'scheduler', () => reportMissedSchedule(release));
      } catch (error) {
        strapi.log.error(
          `[Content Releases] Couldn't report that release ${release.id} missed its schedule`,
          { error }
        );
      }
    }

    return frozen;
  };

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
        cancel(id);
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

    cancel,

    getAll() {
      return scheduledJobs;
    },

    // One sweep at a time on this node; another node's sweep waits on each release's lock
    freezeOverdueReleases({ now = new Date() }: { now?: Date } = {}): Promise<Release[]> {
      if (!sweepInProgress) {
        sweepInProgress = sweepOverdueReleases(now).finally(() => {
          sweepInProgress = null;
        });
      }

      return sweepInProgress;
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
        // A release deleted or frozen since the read has nothing left to arm
        await this.set(release.id, release.scheduledAt).catch((error: unknown) => {
          strapi.log.error(`[Content Releases] Couldn't schedule release ${release.id}`, { error });
        });
      }

      return scheduledJobs;
    },
  };
};

export default createSchedulingService;
