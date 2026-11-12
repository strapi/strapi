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
   * Marks as failed every job still `processing`. Called at boot: a job runs inside the
   * process that created it, so a job still `processing` when the server starts was cut off
   * by a stop or crash and will never settle on its own.
   */
  // TODO @Nico With several instances on one database, a restarting instance also fails a job
  // another instance is still running. That job's own completion then overwrites the status.
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
