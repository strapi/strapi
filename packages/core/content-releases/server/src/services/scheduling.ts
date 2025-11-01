import type { Core } from '@strapi/types';

import { errors } from '@strapi/utils';
import { zonedTimeToUtc } from 'date-fns-tz';
import { Release } from '../../../shared/contracts/releases';
import { getService } from '../utils';
import { RELEASE_MODEL_UID } from '../constants';

const createSchedulingService = ({ strapi }: { strapi: Core.Strapi }) => {
  const scheduledJobs = new Map<Release['id'], string>();

  return {
    async set(releaseId: Release['id'], scheduleDate: Date | string | number) {
      const release = await strapi.db
        .query(RELEASE_MODEL_UID)
        .findOne({ where: { id: releaseId, releasedAt: null } });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      const taskName = `publishRelease_${releaseId}`;
      let schedule: Date;
      let timezoneUsed: string | undefined;

      try {
        if (scheduleDate instanceof Date) {
          schedule = new Date(scheduleDate.getTime());
        } else if (typeof scheduleDate === 'number') {
          schedule = new Date(scheduleDate);
        } else {
          const tzField = (release as any).timezone;
          if (tzField && typeof tzField === 'string' && tzField.includes('&')) {
            const parts = tzField.split('&');
            const region = parts[1];
            timezoneUsed = region;
            try {
              schedule = zonedTimeToUtc(scheduleDate, region);
            } catch (err) {
              schedule = new Date(scheduleDate);
              timezoneUsed = undefined;
            }
          } else {
            schedule = new Date(scheduleDate);
          }
        }

        if (Number.isNaN(schedule.getTime())) {
          throw new Error('Invalid scheduled date');
        }

        try {
          strapi.log?.info?.(
            `[content-releases] scheduling.set: scheduling release=${releaseId} scheduledAt=${String(
              release.scheduledAt
            )} normalized=${schedule.toISOString()} timezone=${timezoneUsed ?? (release as any).timezone ?? 'n/a'}`
          );
        } catch (err) {
          strapi.log?.info?.(`[content-releases] scheduling.set: scheduling release=${releaseId}`);
        }

        strapi.cron.add({
          [taskName]: {
            async task() {
              try {
                await getService('release', { strapi }).publish(releaseId);
                // @TODO: Trigger webhook with success message
              } catch (error) {
                // @TODO: Trigger webhook with error message
              }
            },
            options: schedule,
          },
        });
      } catch (err) {
        strapi.log?.error?.(
          `[content-releases] scheduling.set: could not schedule release=${releaseId} scheduledAt=${String(
            scheduleDate
          )} error=${(err as Error).message}`
        );
        throw err;
      }

      if (scheduledJobs.has(releaseId)) {
        this.cancel(releaseId);
      }

      scheduledJobs.set(releaseId, taskName);

      return scheduledJobs;
    },

    cancel(releaseId: Release['id']) {
      if (scheduledJobs.has(releaseId)) {
        const jobName = scheduledJobs.get(releaseId)!;
        strapi.log?.info?.(
          `[content-releases] scheduling.cancel: cancelling release=${releaseId} job=${jobName}`
        );
        strapi.cron.remove(jobName);
        scheduledJobs.delete(releaseId);
      }

      return scheduledJobs;
    },

    getAll() {
      return scheduledJobs;
    },

    async syncFromDatabase() {
      const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' '); // 'YYYY-MM-DD HH:mm:ss'
      strapi.log?.info?.(
        `[content-releases] scheduling.syncFromDatabase: querying releases scheduled after=${nowUtc} (UTC)`
      );

      const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          scheduledAt: {
            $gte: nowUtc,
          },
          releasedAt: null,
        },
      });

      strapi.log?.info?.(
        `[content-releases] scheduling.syncFromDatabase: found=${releases.length} releases to reschedule`
      );

      for (const release of releases) {
        strapi.log?.info?.(
          `[content-releases] scheduling.syncFromDatabase: rescheduling release=${release.id} scheduledAt=${String(
            release.scheduledAt
          )} timezone=${(release as any).timezone ?? 'n/a'}`
        );

        this.set(release.id, release.scheduledAt);
      }

      return scheduledJobs;
    },
  };
};

export default createSchedulingService;
