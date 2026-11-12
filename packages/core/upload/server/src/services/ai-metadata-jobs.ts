import type { Core } from '@strapi/types';

import { AIMetadataJob } from '../../../shared/contracts/ai-metadata-jobs';
import { AI_METADATA_JOB_UID } from '../models/ai-metadata-job';

/**
 * Fields a job update writes. Dates are written as `Date` instances; they are
 * read back as ISO strings (see `AIMetadataJob`).
 */
type AIMetadataJobUpdate = Partial<Pick<AIMetadataJob, 'status'> & { completedAt: Date }>;

export const createAIMetadataJobsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async createJob(): Promise<number> {
    const job = await strapi.db.query(AI_METADATA_JOB_UID).create({
      data: {
        status: 'processing',
        createdAt: new Date(),
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

  async deleteJob(jobId: number): Promise<void> {
    await strapi.db.query(AI_METADATA_JOB_UID).delete({
      where: { id: jobId },
    });
  },

  /**
   * Marks as failed every job still `processing`. The upload bootstrap calls it once the server
   * listens, to settle the jobs a stop or crash of the previous server left behind.
   */
  // TODO With several servers on one database, a starting server also fails a job another
  // server is still running, and that job's own completion then overwrites the status.
  // Multi-server ownership is tracked as a follow-up: record a job owner or heartbeat so only
  // orphaned jobs are failed.
  async failInterruptedJobs(): Promise<void> {
    await strapi.db.query(AI_METADATA_JOB_UID).updateMany({
      where: { status: 'processing' },
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
});

export type { AIMetadataJob };
