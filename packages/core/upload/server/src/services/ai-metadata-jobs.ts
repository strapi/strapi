import type { Core } from '@strapi/types';

import { AIMetadataJob } from '../../../shared/contracts/ai-metadata-jobs';
import { AI_METADATA_JOB_UID } from '../models/ai-metadata-job';

/**
 * How often the process that runs a job writes the job's `heartbeatAtMs`.
 */
export const AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * How old a `processing` job's heartbeat must be before any server fails the job. It spans several
 * heartbeat intervals so that a slow write, a busy event loop or a clock skew between servers does
 * not fail a job that still runs.
 */
export const AI_METADATA_JOB_STALE_AFTER_MS = 2 * 60_000;

/**
 * Fields a job update writes. Dates are written as `Date` instances; they are
 * read back as ISO strings (see `AIMetadataJob`). The heartbeat is written as
 * epoch milliseconds.
 */
type AIMetadataJobUpdate = Partial<
  Pick<AIMetadataJob, 'status'> & { completedAt: Date; heartbeatAtMs: number | null }
>;

export const createAIMetadataJobsService = ({ strapi }: { strapi: Core.Strapi }) => {
  // The jobs this process runs, each with the timer that writes its heartbeat
  const heartbeats = new Map<number, NodeJS.Timeout>();

  const beat = async (jobId: number): Promise<void> => {
    try {
      await strapi.db.query(AI_METADATA_JOB_UID).updateMany({
        where: { id: jobId, status: 'processing' },
        data: { heartbeatAtMs: Date.now() },
      });
    } catch (error) {
      strapi.log.warn('Could not write the heartbeat of an AI metadata job', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const stopHeartbeat = (jobId: number): void => {
    clearInterval(heartbeats.get(jobId));
    heartbeats.delete(jobId);
  };

  return {
    async createJob(): Promise<number> {
      const now = Date.now();
      const job = await strapi.db.query(AI_METADATA_JOB_UID).create({
        data: {
          status: 'processing',
          createdAt: new Date(now),
          heartbeatAtMs: now,
        },
      });

      return job.id;
    },

    async getJob(jobId: number): Promise<AIMetadataJob | null> {
      return strapi.db.query(AI_METADATA_JOB_UID).findOne({
        where: { id: jobId },
      });
    },

    async updateJob(jobId: number, updates: AIMetadataJobUpdate): Promise<void> {
      await strapi.db.query(AI_METADATA_JOB_UID).update({
        where: { id: jobId },
        data: updates,
      });
    },

    /**
     * Marks a `processing` job as completed or failed. A job that is no longer `processing` is
     * left as it is: once a server failed it as interrupted, the admin has shown that failure and
     * stopped polling, so a late result must not turn it back into a success unseen.
     */
    async settleJob(jobId: number, status: 'completed' | 'failed'): Promise<void> {
      await strapi.db.query(AI_METADATA_JOB_UID).updateMany({
        where: { id: jobId, status: 'processing' },
        data: { status, completedAt: new Date() },
      });
    },

    async deleteJob(jobId: number): Promise<void> {
      await strapi.db.query(AI_METADATA_JOB_UID).delete({
        where: { id: jobId },
      });
    },

    /**
     * Writes the job's heartbeat every `AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS` until
     * `stopHeartbeat`, so that other servers on the same database see the job is still running.
     * The process that runs the job calls it; `createJob` writes the first heartbeat.
     */
    startHeartbeat(jobId: number): void {
      if (heartbeats.has(jobId) === true) {
        return;
      }

      // `beat` never rejects: a failed write is logged, and the next interval tries again
      const timer = setInterval(() => beat(jobId), AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);
      // A heartbeat must never keep a stopping process alive
      timer.unref();
      heartbeats.set(jobId, timer);
    },

    stopHeartbeat,

    /**
     * Marks as failed every job still `processing` whose heartbeat is older than
     * `AI_METADATA_JOB_STALE_AFTER_MS`, or missing (a job created before the heartbeat existed).
     * The process that ran such a job stopped or crashed, since a running job writes its
     * heartbeat at a much shorter interval. Any server can call it: a job that another server
     * still runs has a fresh heartbeat, so it is left alone. The jobs this process runs are
     * never failed, even when their heartbeat writes stopped landing for a while.
     */
    async failInterruptedJobs(): Promise<void> {
      const staleBeforeMs = Date.now() - AI_METADATA_JOB_STALE_AFTER_MS;
      const ownJobIds = [...heartbeats.keys()];

      await strapi.db.query(AI_METADATA_JOB_UID).updateMany({
        where: {
          status: 'processing',
          $or: [{ heartbeatAtMs: { $null: true } }, { heartbeatAtMs: { $lt: staleBeforeMs } }],
          ...(ownJobIds.length > 0 ? { id: { $notIn: ownJobIds } } : {}),
        },
        data: { status: 'failed', completedAt: new Date() },
      });
    },

    /**
     * Stops the heartbeats of this process and marks its running jobs as failed. The upload
     * plugin calls it when the process shuts down, since these jobs can no longer complete.
     * It only touches the jobs this process runs, never another server's.
     */
    async failOwnedJobs(): Promise<void> {
      const jobIds = [...heartbeats.keys()];

      jobIds.forEach(stopHeartbeat);

      if (jobIds.length === 0) {
        return;
      }

      await strapi.db.query(AI_METADATA_JOB_UID).updateMany({
        where: { id: { $in: jobIds }, status: 'processing' },
        data: { status: 'failed', completedAt: new Date() },
      });
    },

    async getLatestActiveJob(): Promise<AIMetadataJob | null> {
      // Despite the name, return the most recent job regardless of status
      // This allows the frontend to see completed/failed status
      return strapi.db.query(AI_METADATA_JOB_UID).findOne({
        orderBy: { createdAt: 'desc' },
      });
    },
  };
};

export type { AIMetadataJob };
